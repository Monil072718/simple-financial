// src/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  // On server render, immediately send users to your static HTML app
  redirect("/nexusflow.html");
}
