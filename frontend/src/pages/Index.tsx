import { useEffect } from "react";
import ScrollExpandMedia from "@/components/ui/scroll-expansion-hero";
import { Hero } from "@/components/ui/animated-hero";
import { FeaturesSectionWithHoverEffects } from "@/components/ui/feature-section-with-hover-effects";
import { Gallery4 } from "@/components/ui/gallery4";
import { VayuDrishtiTimeline } from "@/components/landing/VayuDrishtiTimeline";
import ForSections from "@/components/landing/ForSections";
import SDGSection from "@/components/landing/SDGSection";
import Footer from "@/components/landing/Footer";
import NewsletterSection from "@/components/landing/NewsletterSection";

export default function LandingPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <ScrollExpandMedia
        mediaType="video"
        mediaSrc="https://videos.pexels.com/video-files/10809623/10809623-hd_1920_1080_25fps.mp4"
        posterSrc="https://images.pexels.com/videos/10809623/pexels-photo-10809623.jpeg?auto=compress&cs=tinysrgb&w=1280"
        bgImageSrc="https://images.pexels.com/photos/15893879/pexels-photo-15893879.jpeg?auto=compress&cs=tinysrgb&w=1920"
        title="VayuDrishti Platform"
        date="Sustainable Future"
        scrollToExpand="Scroll to Explore ↓"
        textBlend
      >
        <div className="bg-background">
          <Hero />
          <FeaturesSectionWithHoverEffects />
          <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
            <img
              src="https://images.pexels.com/photos/12482415/pexels-photo-12482415.jpeg?auto=compress&cs=tinysrgb&w=1920"
              alt="Smoke coming out of chimneys in an industrial area"
              className="w-full h-[280px] md:h-[400px] lg:h-[500px] object-cover"
            />
          </div>
          <Gallery4 />
          <VayuDrishtiTimeline />
          <ForSections />
          <SDGSection />
          <NewsletterSection />
          <Footer />
        </div>
      </ScrollExpandMedia>
    </div>
  );
}
