"use client";

import AuthLayout from "../AuthLayout";
import Link from "next/link";

export default function SignupPage() {
  return (
    <AuthLayout
      title="Expense Journal"
      subtitle="Build smarter financial habits"
      rightContent={
        <>
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            Create Account
          </h2>

          <form className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <button className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition">
              Sign Up
            </button>
          </form>

          <div className="my-4 text-center text-gray-500">or</div>

          <button className="w-full border py-3 rounded-lg mb-3">
            Sign up with Google
          </button>

          <p className="text-sm text-center mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-green-600 font-medium">
              Login
            </Link>
          </p>
        </>
      }
    >
      <p className="text-sm opacity-80">
        Capture your spending patterns and journal insights daily.
      </p>
    </AuthLayout>
  );
}