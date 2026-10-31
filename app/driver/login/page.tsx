// app/driver/login/page.tsx
//
// Drivers are STAFF, not customers. The old page used the customer phone-OTP
// flow, which produced a Supabase customer session that the driver portal and
// middleware never accepted (and left /driver readable by anyone). Driver
// accounts are now created in "Manage Staff" and sign in with the mapped
// username + password flow at /employee/login.

import { redirect } from "next/navigation";

export default function DriverLoginRedirect() {
  redirect("/employee/login?role=driver");
}
