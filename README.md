# Rideway - Motorcycle Maintenance Tracker

Rideway is a web application designed to help motorcycle enthusiasts track and manage their bike maintenance with ease. Whether you own one motorcycle or several, Rideway helps you stay on top of maintenance schedules, service history, and associated costs.

## Features

- **Garage Management** - Track multiple motorcycles with complete details including make, model, year, mileage, and photos
- **Maintenance Scheduling** - Set up recurring maintenance tasks based on mileage or time intervals  
- **Service History** - Keep detailed records of all maintenance performed, including costs and receipts
- **Dashboard** - Quick overview of upcoming maintenance tasks and overdue items
- **Data Export/Import** - Backup your data as JSON and restore it across devices
- **Cost Tracking** - Monitor maintenance expenses with visual charts and reports

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI Library**: React
- **Styling**: Tailwind CSS
- **Database**: SQLite  
- **ORM**: Drizzle ORM
- **Authentication**: NextAuth.js
- **Charts**: Chart.js with react-chartjs-2
- **Date Handling**: date-fns

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run database migrations:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

The application will guide you through an initial setup process to create your account and add your first motorcycle.

## Key Features

### For Riders
- Receive timely maintenance reminders based on mileage or time intervals
- View comprehensive service history with easy filtering and search
- Export your complete garage data as a backup

### For DIY Mechanics  
- Track maintenance costs and compare across different motorcycles
- Store notes and photos for each maintenance record
- Create custom maintenance schedules for unique requirements

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## License

This project is open source and available under the MIT License.
