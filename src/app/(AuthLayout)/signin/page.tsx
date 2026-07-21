"use client";

import Link from "next/link";
import { AuthField } from "../_components/AuthField";
import { AuthOAuth } from "../_components/AuthOAuth";
import { AuthShell } from "../_components/AuthShell";
import { EyeClosedIcon, EyeIcon } from "lucide-react";
import { useCallback, useState } from "react";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setAuthDetails } from "@/redux/feature/authSlice";
import createAxiosInstance from "@/app/axiosInstance";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

interface LoginValues{
  email: string;
  password: string;
}



export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const axiosInstance = createAxiosInstance();

  // Zod schema for login validation
  const loginShcema = z.object({
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  })

  const {register, handleSubmit, reset,formState:{errors, isSubmitting}} = useForm<LoginValues>({
    resolver: zodResolver(loginShcema),
  })

  const handleLoginSuccess = useCallback(
    async (accessToken: string, refreshToken: string) => {
      try{
        const decodedToken: DecodedToken = jwtDecode(accessToken);
        console.log('Decoded token:', decodedToken);

        if(!decodedToken?.sub){
          throw new Error('Invalid token');
        }
        const authData = {
          user: {
            id: decodedToken.sub,
            email: decodedToken.email,
            full_name: '',
          },
          token: accessToken,
          iat: decodedToken.iat,
          exp: decodedToken.exp,
        }
        dispatch(setAuthDetails(authData));
        // router.push('/choose-app');
      }
      catch(error){
        console.error('Login failed:', error);
      }

    },[dispatch]
  )

  const loginHandler = async (data: z.infer<typeof loginShcema>) => {
    console.log(data);
    try{
      const response = await axiosInstance.post('/auth/login', data);
      if(response.status === 200){
        const {accessToken, refreshToken} = response.data.data;

        Cookies.set('access_token', accessToken,{
          expires: 15,
          sameSite:'lax',
          path:'/',
          secure: window.location.protocol === 'https:'
        });
        try{
          await handleLoginSuccess(accessToken, refreshToken);
          console.log('Login successful');
          reset(data);
          setTimeout(()=>{
            router.push('/choose-app');
          }, 1000);
        }catch(error){
          console.error('Login failed:', error);
        }
      }
    }catch(error){
      console.error('API request failed:', error);
      // toast.error('Login failed. Please try again.');
    }
  }

  type DecodedToken = {
    sub: string;
    email: string;
    iat: number;
    exp: number;
  }




  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage expenses and budgets."
      panelTitle="Take control of your money"
      panelDescription="See where every dollar goes and stay on budget without spreadsheets."
      panelBullets={[
        "Real-time tracking across categories",
        "Budget alerts before you overspend",
        "Clean exports for taxes",
      ]}
      footer={
        <>
          <span className="auth-muted">No account? </span>
          <Link href="/signup" className="auth-link">
            Create one
          </Link>
        </>
      }
    >
      {/* TODO: onSubmit → POST /auth/login, store session, redirect('/choose-app') */}
      <form
        className="space-y-3"
        onSubmit={handleSubmit(loginHandler)}
      >
        <AuthField>
          <label htmlFor="signin-email" className="auth-label">
            Email
          </label>
          <input
            id="signin-email"
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="auth-input mt-1"
            suppressHydrationWarning
          />
          {errors.email &&(<p className="text-red-500 text-sm">{errors.email.message}</p>)}
        </AuthField>

        <AuthField>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="signin-password" className="auth-label">
              Password
            </label>
            <Link
              href="/reset-password"
              className="text-[11px] font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <span className="absolute right-3 flex items-center justify-center inset-y-0  text-slate-400"
            onClick={() => setShowPassword(!showPassword)}
            role="button"
            >
              {showPassword ? <EyeIcon className="size-4" /> : <EyeClosedIcon className="size-4" />}
            </span>
          <input
            id="signin-password"
            {...register('password')}
            type={showPassword ? "text":"password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="auth-input mt-1"
          />
          {errors.password &&(<p className="text-red-500 text-sm">{errors.password.message}</p>)}
          </div>

        </AuthField>

        <AuthField>
          <label className="flex cursor-pointer items-center gap-2 auth-muted">
            <input
              type="checkbox"
              name="remember"
              className="size-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600"
            />
            Remember me
          </label>
        </AuthField>

        <AuthField>
          <button type="submit" className="auth-btn-primary">
            Sign in
          </button>
        </AuthField>
      </form>

      <AuthOAuth label="or continue with" />
    </AuthShell>
  );
}
