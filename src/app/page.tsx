import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Destaques from "@/components/Destaques";
import Historia from "@/components/Historia";
import Depoimentos from "@/components/Depoimentos";
import Delivery from "@/components/Delivery";
import HorariosLocal from "@/components/HorariosLocal";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <Hero />
      <Destaques />
      <Historia />
      <Depoimentos />
      <Delivery />
      <HorariosLocal />
    </>
  );
}
