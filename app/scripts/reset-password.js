#!/usr/bin/env node
// app/scripts/reset-password.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');
const { drizzle } = require('drizzle-orm/libsql');
const { eq } = require('drizzle-orm');
const path = require('path');
const fs = require('fs');

// Database URL - use the one from environment or default to 'moto_maintain.db'
const dbUrl = process.env.DATABASE_URL || "file:moto_maintain.db";
const client = createClient({ url: dbUrl });

// Define the schema directly in this file to avoid import issues
function createSchema() {
  const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');

  const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email").notNull().unique(),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
  });

  const passwordResetTokens = sqliteTable("password_reset_tokens", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    used: integer("used", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
  });

  return { users, passwordResetTokens };
}

/**
 * Initialize database connection and ensure the password_reset_tokens table exists
 */
async function initializeDb() {
  try {
    // Create schema instance
    const schema = createSchema();
    const db = drizzle(client, { schema });

    // Check if password_reset_tokens table exists, create it if not
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL UNIQUE,
          expires_at INTEGER NOT NULL,
          used INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );
      `);
      console.log("Password reset tokens table verified.");
    } catch (error) {
      console.error("Warning: Could not verify password_reset_tokens table:", error);
      console.log("Continuing anyway...");
    }

    return { db, schema };
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

async function generateToken(email) {
  console.log(`Generating reset token for email: ${email}...`);
  
  const { db, schema } = await initializeDb();
  
  // Find the user
  try {
    const users = await db.select().from(schema.users).where(eq(schema.users.email, email));
    
    if (!users || users.length === 0) {
      console.error(`Error: User with email ${email} not found`);
      process.exit(1);
    }
    
    const user = users[0];
    
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Insert the token into the database
    try {
      await db.insert(schema.passwordResetTokens).values({
        id: crypto.randomBytes(16).toString('hex'),
        userId: user.id,
        token: token,
        expiresAt: expiresAt,
        used: false,
        createdAt: new Date(),
      });
      
      console.log('\n✅ Password reset token generated successfully');
      console.log('-------------------------------------------');
      console.log(`User: ${user.name} (${user.email})`);
      console.log(`Token: ${token}`);
      console.log(`Expires: ${expiresAt.toLocaleString()}`);
      console.log('\nTo reset the password, use:');
      console.log(`node app/scripts/reset-password.js reset ${token} "new-password"`);
      console.log('\nOr share this reset link with the user:');
      console.log(`http://localhost:3000/auth/reset-password/${token}`);
      console.log('-------------------------------------------');
    } catch (error) {
      console.error('Error generating token:', error);
      console.error('The password_reset_tokens table might not exist in the database.');
      console.error('Please run the migration script first: npm run db:migrate');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error querying user:', error);
    process.exit(1);
  }
}

async function resetPassword(token, newPassword) {
  console.log('Resetting password...');
  
  const { db, schema } = await initializeDb();
  
  try {
    // Find the token
    const tokens = await db.select().from(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.token, token));
    
    if (!tokens || tokens.length === 0) {
      console.error('Error: Invalid or expired token');
      process.exit(1);
    }
    
    const resetToken = tokens[0];
    
    if (resetToken.used) {
      console.error('Error: This token has already been used');
      process.exit(1);
    }
    
    const now = new Date();
    if (new Date(resetToken.expiresAt) < now) {
      console.error('Error: This token has expired');
      process.exit(1);
    }
    
    // Get the user
    const users = await db.select().from(schema.users).where(eq(schema.users.id, resetToken.userId));
    
    if (!users || users.length === 0) {
      console.error('Error: User not found');
      process.exit(1);
    }
    
    const user = users[0];
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    await db.update(schema.users)
      .set({ password: hashedPassword })
      .where(eq(schema.users.id, user.id));
    
    // Mark the token as used
    await db.update(schema.passwordResetTokens)
      .set({ used: true })
      .where(eq(schema.passwordResetTokens.id, resetToken.id));
    
    console.log('\n✅ Password reset successful');
    console.log('-------------------------------------------');
    console.log(`User: ${user.name} (${user.email})`);
    console.log('The password has been updated');
    console.log('-------------------------------------------');
  } catch (error) {
    console.error('Error during password reset:', error);
    process.exit(1);
  }
}

// Main function to handle command-line arguments
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.error('Error: No command specified');
    console.log('Usage:');
    console.log('  generate <email> - Generate a reset token for a user');
    console.log('  reset <token> <new-password> - Reset a password using a token');
    process.exit(1);
  }
  
  if (command === 'generate') {
    if (!args[1]) {
      console.error('Error: No email specified');
      console.log('Usage: generate <email>');
      process.exit(1);
    }
    
    await generateToken(args[1]);
  } else if (command === 'reset') {
    if (!args[1] || !args[2]) {
      console.error('Error: Token and new password are required');
      console.log('Usage: reset <token> <new-password>');
      process.exit(1);
    }
    
    await resetPassword(args[1], args[2]);
  } else {
    console.error(`Error: Unknown command "${command}"`);
    console.log('Usage:');
    console.log('  generate <email> - Generate a reset token for a user');
    console.log('  reset <token> <new-password> - Reset a password using a token');
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});