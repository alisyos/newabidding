"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/** 앱 전역 토스트 컨테이너 (레이아웃에서 1회 장착) */
export function ToastProvider() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={2500}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      theme="light"
    />
  );
}
