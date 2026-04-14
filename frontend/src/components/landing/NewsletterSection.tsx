import { useState } from "react";
import { ArrowRight } from "lucide-react";

export default function NewsletterSection() {
  const [agreed, setAgreed] = useState(false);
  const [emailComms, setEmailComms] = useState(false);

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-800 mb-10">
          Stay up-to-date
        </h2>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-6"
        >
          {/* Row 1: First Name & Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3 border-b border-neutral-500 pb-3">
              <ArrowRight size={16} className="text-neutral-600 shrink-0" />
              <input
                type="text"
                placeholder="First Name"
                className="bg-transparent w-full text-neutral-800 placeholder-neutral-600 font-medium text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3 border-b border-neutral-500 pb-3">
              <ArrowRight size={16} className="text-neutral-600 shrink-0" />
              <input
                type="text"
                placeholder="Last Name"
                className="bg-transparent w-full text-neutral-800 placeholder-neutral-600 font-medium text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Email & Company */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3 border-b border-neutral-500 pb-3">
              <ArrowRight size={16} className="text-neutral-600 shrink-0" />
              <input
                type="email"
                placeholder="Email address*"
                required
                className="bg-transparent w-full text-neutral-800 placeholder-neutral-600 font-medium text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3 border-b border-neutral-500 pb-3">
              <ArrowRight size={16} className="text-neutral-600 shrink-0" />
              <input
                type="text"
                placeholder="Company"
                className="bg-transparent w-full text-neutral-800 placeholder-neutral-600 font-medium text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Checkboxes & Submit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <label className="flex items-start gap-3 cursor-pointer text-xs text-neutral-600 leading-relaxed">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-neutral-700 shrink-0"
              />
              Acknowledge and agree to our{" "}
              <a href="#" className="underline hover:text-neutral-800">
                privacy policy
              </a>{" "}
              *
            </label>
            <div className="flex items-start justify-between gap-4">
              <label className="flex items-start gap-3 cursor-pointer text-xs text-neutral-600 leading-relaxed">
                <input
                  type="checkbox"
                  checked={emailComms}
                  onChange={(e) => setEmailComms(e.target.checked)}
                  className="mt-0.5 accent-neutral-700 shrink-0"
                />
                Email communications, including the newsletter, from VayuDrishti *
              </label>
              <button
                type="submit"
                className="shrink-0 flex items-center gap-2 border border-neutral-700 text-neutral-800 text-sm font-medium px-6 py-2.5 rounded-sm hover:bg-neutral-800 hover:text-white transition-colors duration-200"
              >
                <ArrowRight size={14} />
                Submit
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
