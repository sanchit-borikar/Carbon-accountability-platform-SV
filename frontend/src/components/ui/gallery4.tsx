// src/components/ui/gallery4.tsx
"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export interface Gallery4Item {
  id: string;
  title: string;
  description: string;
  href: string;
  image: string;
}

export interface Gallery4Props {
  title?: string;
  description?: string;
  items: Gallery4Item[];
}

const ecotraceData: Gallery4Item[] = [
  {
    id: "iot-ingestion",
    title: "Real-Time IoT Sensor Network",
    description:
      "Factory, vehicle & power plant sensors stream live CO₂ data via paho-mqtt with JWT authentication across Industry, Transport & Energy sectors.",
    href: "/dashboard/data",
    image:
      "https://www.vodafone.co.uk/newscentre/wp-content/uploads/2020/07/Matthew-Wilkinson-and-IoT-Sensor-scaled.jpg",
  },
  {
    id: "satellite-verification",
    title: "NASA Satellite Cross-Verification",
    description:
      "NASA GEOS-CF & Google Earth Engine triangulate every self-reported emission value. Discrepancies above 20% are automatically flagged.",
    href: "/dashboard/data",
    image:
      "https://www.esa.int/var/esa/storage/images/esa_multimedia/images/2021/02/co2m/23148245-1-eng-GB/CO2M_pillars.jpg",
  },
  {
    id: "ai-forecasting",
    title: "AI-Powered Emission Forecasting",
    description:
      "Facebook Prophet predicts sector-level emissions 30, 60 & 90 days ahead with 87% accuracy using seasonal decomposition and machine learning.",
    href: "/dashboard/analytics",
    image:
      "https://images.unsplash.com/photo-1488229297570-58520851e868?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
  },
  {
    id: "blockchain-audit",
    title: "Polygon Blockchain Audit Trail",
    description:
      "Every verified emission record is SHA-256 hashed and permanently written to Polygon via Solidity smart contracts. Tamper-proof and immutable forever.",
    href: "/dashboard/alerts",
    image:
      "https://images.unsplash.com/photo-1644088379091-d574269d422f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
  },
  {
    id: "compliance-scoring",
    title: "Public Compliance Scoring",
    description:
      "Every company gets a 0–100 daily compliance score (A/B/C/D/F) based on emission volume, trend, data integrity & violation history. Publicly visible.",
    href: "/dashboard/profiles",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
  },
];

const Gallery4 = ({
  title = "How VayuDrishti Works",
  description =
    "From raw IoT sensor data to blockchain-immutable public scores — explore every layer of VayuDrishti's verified carbon emission tracking platform.",
  items = ecotraceData,
}: Gallery4Props) => {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    const updateSelection = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
      setCurrentSlide(carouselApi.selectedScrollSnap());
    };
    updateSelection();
    carouselApi.on("select", updateSelection);
    return () => {
      carouselApi.off("select", updateSelection);
    };
  }, [carouselApi]);

  return (
    <section className="py-32 bg-[#f8faff]">
      <div className="container mx-auto">
        <div className="mb-8 flex items-end justify-between md:mb-14 lg:mb-16">
          <div className="flex flex-col gap-4">
            {/* Section label */}
            <span className="text-xs font-semibold tracking-widest text-blue-600 uppercase">
              Platform in Action
            </span>
            <h2 className="text-3xl font-bold text-neutral-900 md:text-4xl lg:text-5xl">
              {title}
            </h2>
            <p className="max-w-lg text-neutral-500 text-base leading-relaxed">
              {description}
            </p>
          </div>
          {/* Arrow buttons */}
          <div className="hidden shrink-0 gap-2 md:flex">
            <Button
              size="icon"
              variant="outline"
              onClick={() => carouselApi?.scrollPrev()}
              disabled={!canScrollPrev}
              className="disabled:pointer-events-auto border-blue-200 hover:bg-blue-50 hover:border-blue-400 disabled:opacity-40"
            >
              <ArrowLeft className="size-5 text-blue-600" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => carouselApi?.scrollNext()}
              disabled={!canScrollNext}
              className="disabled:pointer-events-auto border-blue-200 hover:bg-blue-50 hover:border-blue-400 disabled:opacity-40"
            >
              <ArrowRight className="size-5 text-blue-600" />
            </Button>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <div className="w-full">
        <Carousel
          setApi={setCarouselApi}
          opts={{
            breakpoints: {
              "(max-width: 768px)": {
                dragFree: true,
              },
            },
          }}
        >
          <CarouselContent className="ml-0 2xl:ml-[max(8rem,calc(50vw-700px))] 2xl:mr-[max(0rem,calc(50vw-700px))]">
            {items.map((item) => (
              <CarouselItem
                key={item.id}
                className="max-w-[320px] pl-[20px] lg:max-w-[400px]"
              >
                <a href={item.href} className="group rounded-xl">
                  <div className="group relative h-full min-h-[27rem] max-w-full overflow-hidden rounded-xl md:aspect-[5/4] lg:aspect-[16/9]">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="absolute h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Blue gradient overlay instead of primary */}
                    <div className="absolute inset-0 h-full bg-gradient-to-t from-blue-950/90 via-blue-900/40 to-transparent" />

                    {/* Content */}
                    <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-6 text-white md:p-8">
                      {/* Tag */}
                      <span className="mb-3 text-xs font-semibold tracking-widest text-blue-300 uppercase">
                        VayuDrishti Platform
                      </span>
                      <div className="mb-2 text-xl font-bold md:mb-3">
                        {item.title}
                      </div>
                      <div className="mb-8 line-clamp-2 text-sm text-blue-100 md:mb-12 lg:mb-9">
                        {item.description}
                      </div>
                      <div className="flex items-center text-sm font-semibold text-blue-300 group-hover:text-white transition-colors duration-200">
                        Explore feature{" "}
                        <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </a>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Dot indicators */}
        <div className="mt-8 flex justify-center gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === index
                  ? "bg-blue-600 w-6"
                  : "bg-blue-200 w-2 hover:bg-blue-400"
              }`}
              onClick={() => carouselApi?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export { Gallery4 };