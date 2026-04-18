"use client";

import AuthLayout from "../AuthLayout";
import Link from "next/link";

export default function LoginPage() {
  return (
    <AuthLayout
      title="Expense Tracker"
      subtitle="Track. Save. Reflect."
      rightContent={
        <>
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            Welcome Back
          </h2>

          <form className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                Remember me
              </label>
              <a href="#" className="text-blue-600">
                Forgot password?
              </a>
            </div>

            <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition">
              Login
            </button>
          </form>

          <div className="my-4 text-center text-gray-500">or</div>

          <button className="w-full border py-3 rounded-lg mb-3">
            Sign in with Google
          </button>

          <p className="text-sm text-center mt-4">
            Don’t have an account?{" "}
            <Link href="/signup" className="text-blue-600 font-medium">
              Sign Up
            </Link>
          </p>
        </>
      }
    >
      <p className="text-sm opacity-80">
        Manage your expenses and journal your daily financial habits.
      </p>
    </AuthLayout>
  );
}