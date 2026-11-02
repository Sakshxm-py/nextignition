import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { brandColors } from '../utils/colors';

export function SuccessStoriesSection() {
  const testimonials = [
    {
      quote: "NextIgnition connected me with the perfect mentor who helped me refine my pitch. We closed our seed round within 3 months!",
      initials: "F",
      name: "Founder",
      title: "Seed Stage Startup",
      color: brandColors.atomicOrange,
    },
    {
      quote: "The AI tools saved me hours of work. The pitch deck summarizer gave me insights I never would have caught myself.",
      initials: "C",
      name: "Co-founder",
      title: "Growth Stage Startup",
      color: brandColors.electricBlue,
    },
    {
      quote: "As an expert, I've been able to help dozens of founders while building my personal brand. The platform makes it effortless.",
      initials: "E",
      name: "Expert Mentor",
      title: "Industry Advisor",
      color: brandColors.navyBlue,
    },
  ];

  return (
    <section id="testimonials" className="relative bg-white py-24 overflow-hidden">

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wider mb-4"
            style={{ 
              backgroundColor: `${brandColors.atomicOrange}22`,
              color: brandColors.atomicOrange 
            }}
          >
            SUCCESS STORIES
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-4">
            Trusted by Founders Worldwide
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl">
            Join thousands of founders and experts who are building the future together.
          </p>
        </motion.div>

        {/* Testimonials Grid - 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 * index }}
              className="relative group"
            >
              {/* Card */}
              <div className="bg-gray-50 rounded-3xl p-8 h-full flex flex-col relative overflow-hidden hover:shadow-xl transition-all">
                {/* Quote Icon */}
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: `${testimonial.color}22` }}
                >
                  <Quote className="w-6 h-6" style={{ color: testimonial.color }} />
                </div>

                {/* Quote Text */}
                <p className="text-gray-800 leading-relaxed mb-8 flex-1 text-base">
                  "{testimonial.quote}"
                </p>

                {/* Author Info */}
                <div className="flex items-center gap-4">
                  {/* Avatar with Initials */}
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ backgroundColor: testimonial.color }}
                  >
                    {testimonial.initials}
                  </motion.div>

                  {/* Name and Title */}
                  <div>
                    <div className="font-bold text-gray-900 text-base">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {testimonial.title}
                    </div>
                  </div>
                </div>

                {/* Decorative gradient on hover */}
                <div 
                  className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                  style={{ backgroundColor: testimonial.color }}
                />

                {/* Border accent */}
                <div 
                  className="absolute top-0 left-0 w-1 h-20 rounded-r"
                  style={{ backgroundColor: testimonial.color }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}