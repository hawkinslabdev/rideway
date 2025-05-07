// app/setup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bike, Wrench, AlertCircle } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react"; // Import signIn from next-auth
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateStep1 = () => {
    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    setError("");
  
    if (step === 1) {
      if (!validateStep1()) return;
  
      setLoading(true);
      try {
        // Register the user
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
          }),
        });
  
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to create account");
        }
  
        // Use next-auth signIn function instead of fetch
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
  
        if (result?.error) {
          throw new Error("Account created, but login failed: " + result.error);
        }
  
        setStep(2);
      } catch (error) {
        setError(error instanceof Error ? error.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      router.push("/garage/add?initial=true");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4 py-12">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <Bike className="mx-auto h-10 w-10 text-blue-600" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Welcome to Rideway</h1>
          <p className="text-sm text-gray-600">Let's get you set up in a few quick steps</p>
        </div>

        <div className="flex justify-center items-center space-x-2">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center space-x-2">
              <div
                className={`h-8 w-8 flex items-center justify-center rounded-full text-sm font-semibold ${
                  step >= s ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-700"
                }`}
              >
                {s}
              </div>
              {s < 2 && <div className="h-1 w-6 bg-gray-300 rounded-full" />}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Add Your First Motorcycle</h3>
                <p className="text-sm text-gray-600">Let's start with basic details and mileage</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-md flex items-start space-x-3">
                <Wrench className="h-5 w-5 text-blue-400 mt-1" />
                <div>
                  <h4 className="font-medium text-blue-800 text-sm">Smart Maintenance</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    We'll help you track maintenance based on your bike's specs and use.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <div />
          )}

          <Button onClick={handleNext} disabled={loading}>
            {loading
              ? "Processing..."
              : step === 2
              ? "Add My First Motorcycle"
              : "Next"}
          </Button>
        </div>
      </Card>
    </div>
  );
}