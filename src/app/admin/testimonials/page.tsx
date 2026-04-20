import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { testimonials, hospitals } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Star, CheckCircle } from "lucide-react";

export default async function TestimonialsAdminPage() {
  await requireAuth();

  const allTestimonials = await db
    .select({
      id: testimonials.id,
      patientName: testimonials.patientName,
      patientCountry: testimonials.patientCountry,
      patientAge: testimonials.patientAge,
      rating: testimonials.rating,
      title: testimonials.title,
      story: testimonials.story,
      isVerified: testimonials.isVerified,
      isFeatured: testimonials.isFeatured,
      isActive: testimonials.isActive,
      createdAt: testimonials.createdAt,
      hospitalName: hospitals.name,
    })
    .from(testimonials)
    .leftJoin(hospitals, eq(testimonials.hospitalId, hospitals.id))
    .orderBy(desc(testimonials.createdAt));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Testimonials</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allTestimonials.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{t.patientName}</p>
                <p className="text-xs text-gray-500">{t.patientCountry}{t.patientAge ? `, ${t.patientAge} yrs` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                {t.isVerified && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {t.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 mb-2">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              ))}
            </div>
            {t.title && <p className="font-medium text-gray-800 text-sm mb-1">{t.title}</p>}
            <p className="text-sm text-gray-600 line-clamp-3">{t.story}</p>
            {t.hospitalName && (
              <p className="text-xs text-teal-600 mt-2">{t.hospitalName}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
