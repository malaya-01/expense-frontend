'use client'
import { useRouter } from "next/navigation";
import React, { useEffect } from 'react'
import Cookies from 'js-cookie';
import { handleLogout, resetReduxStore } from '@/redux/store';

const page = () => {

    const router = useRouter()

    useEffect(() => {
        Cookies.remove('access_token')
        window.localStorage.removeItem('persist:root')
        window.localStorage.removeItem('authDetails')

        handleLogout().then(()=>{
            setTimeout(()=>{
                router.replace('/signin')
            }, 1000)
        })

    }, [])

  return (
    <div></div>
  )
}

export default page