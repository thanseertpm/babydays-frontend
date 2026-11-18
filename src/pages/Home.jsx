import BannerDisplay from "../components/BannerDisplay";
import CategorySection from "../components/CategorySection";
import Features from "../components/Features";
import NewArrivals from "../components/NewArrivals";
import Testimonials from "../components/Testimonials";

export default function Home() {
  return (
    <div>
      <BannerDisplay />
      <CategorySection />
      <NewArrivals />
      <Features />
      <Testimonials />
    </div>
  );
}
