import { ArrowRight, BadgeCheck, Database, Search, ShieldCheck, Store, UsersRound, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useAgentContext } from "../hooks/useAgentContext";
import { useAuth } from "../providers/AuthProvider";

export default function Home() {
  const { agent } = useAgentContext();
  const { user } = useAuth();
  const title =
    agent?.profile?.shop_name ||
    agent?.agent?.shop_name ||
    "Data that keeps you connected";
  return (
    <div className="home-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow"><Zap size={15} /> Fast, clear and dependable</span>
          <h1>{title}</h1>
          <p>Buy mobile data in a few steps, manage agent and sub-agent pricing, track orders and receive profits from one focused platform.</p>
          <div className="hero-actions">
            <Link className="button primary" to="/data">Browse data packages <ArrowRight size={18} /></Link>
            <Link className="button secondary" to="/track-order">Track data order <Search size={17} /></Link>
            {!user && <Link className="button secondary" to="/register">Create an account</Link>}
          </div>
        </div>
        <div className="hero-orbit" aria-hidden="true"><Database size={62} /><span className="orbit one" /><span className="orbit two" /></div>
      </section>
      <section className="feature-grid">
        <article><span><Zap /></span><h2>Quick fulfilment</h2><p>Place, pay for and track data orders from one straightforward flow.</p></article>
        <article><span><Store /></span><h2>Agent storefronts</h2><p>Agents and sub-agents control customer prices while the platform preserves the correct profit split.</p></article>
        <article><span><ShieldCheck /></span><h2>Secure payments</h2><p>Wallet and Paystack transaction records stay linked to every order.</p></article>
        <article><span><UsersRound /></span><h2>Role-based control</h2><p>Purpose-built dashboards for the owner, agents, sub-agents and customers.</p></article>
      </section>
      <section className="trust-strip"><BadgeCheck size={22} /><div><strong>Built for transparent data sales</strong><span>Clear prices, auditable transactions and accountable order fulfilment.</span></div></section>
    </div>
  );
}
