import AttendanceAuthLayout from "./AttendanceAuthLayout";

export const metadata = {
  title: "Shatter Adminarea",
};

export default function AttendanceLayout({ children }) {
  return <AttendanceAuthLayout>{children}</AttendanceAuthLayout>;
}
