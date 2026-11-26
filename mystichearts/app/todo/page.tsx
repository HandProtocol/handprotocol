import type { Metadata } from "next";
import { TodoApp } from "@/components/todo/todo-app";

export const metadata: Metadata = {
  title: "Team list | Mystic Hearts",
  description: "The Mystic Hearts team to-do list.",
  robots: { index: false, follow: false },
};

export default function Todo() {
  return <TodoApp />;
}
