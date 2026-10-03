import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

const principles = [
  { number: "01", title: "Comfort comes first", copy: "Soft fabrics and easy shapes make getting dressed feel simple." },
  { number: "02", title: "Made for real days", copy: "Pieces that move with you, from the first coffee to the last stop." },
  { number: "03", title: "Keep reaching for it", copy: "Everyday staples designed to work together and wear on repeat." },
];

export default function About() {
  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#171717]">
      <Navbar />
      <main>
        <section className="bg-[#111111] text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:gap-16 lg:py-24">
            <div>
              <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d5bd8b]"><span className="h-px w-8 bg-[#d5bd8b]" /> The NOVA point of view</p>
              <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl">Clothes for the way <span className="text-[#c8b58e]">you move.</span></h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-white/60">NOVA is a clothing label built around the pieces that make everyday dressing feel a little easier: considered fits, soft-touch fabrics, and room to be yourself.</p>
              <Link to="/shop" className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#f1ebdf] px-6 py-4 text-sm font-semibold text-black transition hover:bg-white">Explore the collection <ArrowRight size={16} /></Link>
            </div>
            <div className="relative aspect-[1.12] overflow-hidden rounded-[30px] bg-[#302b22]">
              <img src="/images/apparel/everyday-oxford-shirt.jpg" alt="Everyday clothing in a warm, natural palette" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              <p className="absolute bottom-6 left-6 text-xs font-semibold uppercase tracking-[0.25em] text-white/80">Everyday pieces. Considered details.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid gap-8 md:grid-cols-[.7fr_1.3fr] md:gap-16">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a8055]">A little more about us</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Good clothes should feel like yours.</h2></div>
            <p className="max-w-2xl text-lg leading-8 text-neutral-600">We believe a useful wardrobe starts with pieces you want to wear again. So we keep our focus on the feel of the fabric, the ease of the fit, and the small details that make getting dressed feel natural.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {principles.map((principle) => <article key={principle.number} className="rounded-[24px] border border-black/[0.08] bg-white p-6 sm:p-8"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#f2eee6] text-sm font-semibold text-[#927548]">{principle.number}</span><h3 className="mt-8 text-xl font-semibold">{principle.title}</h3><p className="mt-2 text-sm leading-6 text-neutral-500">{principle.copy}</p></article>)}
          </div>
        </section>

        <section className="border-y border-black/[0.06] bg-[#efede7]">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-14 sm:px-8 sm:py-20 md:flex-row md:items-end md:justify-between">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#806846]">Find your everyday</p><h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">A wardrobe that feels like you.</h2><p className="mt-4 max-w-xl text-base leading-7 text-neutral-600">Start with an easy favorite, then make it your own.</p></div>
            <Link to="/shop" className="inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800">Shop clothes <ArrowRight size={16} /></Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
