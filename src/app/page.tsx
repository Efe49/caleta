import type { Metadata } from "next";
import { Game } from "@/components/pesca/game";

export const metadata: Metadata = {
  title: { absolute: "Caleta · Pesca en el muelle" },
  description:
    "Pesca en la caleta, mejora fuerza, suerte, paciencia y técnica, y compra cañas, cebos y caladeros nuevos.",
};

export default function HomePage() {
  return <Game />;
}
