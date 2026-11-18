import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Search, ShieldAlert } from 'lucide-react';
import { BotanicalSprig, BotanicalStemDivider } from '../components/BotanicalMark';
import { EDUCATIONAL_ARTICLES, type EducationalArticle } from '../data/catalogs';

interface LearnViewProps {
  initialArticleId?: string | null;
}

const CATEGORIES: ('All' | EducationalArticle['category'])[] = [
  'All',
  'Fundamentals',
  'Phases',
  'Symptoms & Care',
  'Medical Guidance',
];

export const LearnView: React.FC<LearnViewProps> = ({ initialArticleId }) => {
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof CATEGORIES)[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticleId, setActiveArticleId] = useState<string | null>(
    initialArticleId ?? null
  );

  useEffect(() => {
    setActiveArticleId(initialArticleId ?? null);
  }, [initialArticleId]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EDUCATIONAL_ARTICLES.filter((a) => {
      const catMatch = selectedCategory === 'All' || a.category === selectedCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.keyPoints.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  const activeArticle = activeArticleId
    ? EDUCATIONAL_ARTICLES.find((a) => a.id === activeArticleId) ?? null
    : null;

  return (
    <div className="floura-fade-in space-y-8">
      {/* Editorial Magazine Header */}
      <header className="flex flex-col justify-between gap-4 border-b border-[#342B2D]/10 pb-6 sm:flex-row sm:items-end dark:border-[#F6F0EA]/12">
        <div>
          <span className="font-ui text-xs font-semibold tracking-wide text-[#705264] dark:text-[#D9A7AF]">
            Wellness Library
          </span>
          <h1 className="mt-1 font-heading text-4xl font-semibold tracking-tight text-[#342B2D] sm:text-5xl dark:text-[#F6F0EA]">
            Menstrual Health Journal
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
            Thoughtful, evidence-based guides on cycle physiology, everyday comfort, and knowing when to consult a clinician.
          </p>
        </div>
        <BotanicalSprig className="hidden h-8 w-16 shrink-0 text-[#A4AE96] sm:block dark:text-[#B3BDAA]" />
      </header>

      {/* Permanent Educational Disclaimer */}
      <aside
        aria-label="Educational disclaimer"
        className="rounded-2xl border border-[#705264]/20 bg-[#F0E9E2]/80 p-4 text-xs leading-relaxed text-[#342B2D] dark:border-[#D9A7AF]/25 dark:bg-[#231C1F] dark:text-[#F6F0EA]"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert
            className="mt-0.5 h-4 w-4 shrink-0 text-[#705264] dark:text-[#D9A7AF]"
            aria-hidden="true"
          />
          <p>
            <strong>Educational Resource Only:</strong> Cycle lengths and experiences vary naturally from person to person. FLOURA supports personal tracking and health literacy—it does not diagnose medical conditions, confirm ovulation, or provide contraception advice, and is not a substitute for professional medical care.
          </p>
        </div>
      </aside>

      {activeArticle ? (
        <article className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 sm:p-10 dark:border-[#F6F0EA]/10 dark:bg-[#282024]">
          <button
            type="button"
            onClick={() => setActiveArticleId(null)}
            className="font-ui inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#705264] transition hover:bg-[#F0E9E2] dark:text-[#D9A7AF] dark:hover:bg-[#31272C]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to all guides</span>
          </button>

          <div className="mx-auto mt-5 max-w-[68ch]">
            <div className="flex items-center gap-2 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              <span className="font-ui font-semibold text-[#705264] dark:text-[#D9A7AF]">
                {activeArticle.category}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeArticle.readTime}</span>
            </div>

            <h2 className="mt-2 font-editorial text-3xl font-medium text-balance text-[#342B2D] sm:text-4xl dark:text-[#F6F0EA]">
              {activeArticle.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
              {activeArticle.summary}
            </p>

            <BotanicalStemDivider className="my-7" />

            <div className="rounded-2xl border border-[#342B2D]/10 bg-[#F8F4EC] p-6 dark:border-[#F6F0EA]/10 dark:bg-[#191416]">
              <h3 className="font-heading text-xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                Key Takeaways
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[#342B2D] dark:text-[#F6F0EA]">
                {activeArticle.keyPoints.map((pt, idx) => (
                  <li key={pt} className="flex items-start gap-2.5">
                    <span className="font-heading text-base font-semibold text-[#705264] tabular-nums dark:text-[#D9A7AF]">
                      0{idx + 1}.
                    </span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 space-y-7">
              {activeArticle.sections.map((sec) => (
                <section key={sec.heading}>
                  <h3 className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                    {sec.heading}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#342B2D]/90 sm:text-base dark:text-[#F6F0EA]/90">
                    {sec.body}
                  </p>
                </section>
              ))}
            </div>
          </div>
        </article>
      ) : (
        <>
          {/* Filter & Search Bar */}
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div
              role="tablist"
              aria-label="Filter educational topics"
              className="flex flex-wrap items-center gap-1 rounded-2xl bg-[#F0E9E2] p-1 dark:bg-[#231C1F]"
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  role="tab"
                  type="button"
                  aria-selected={selectedCategory === cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`font-ui min-h-[40px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-white text-[#342B2D] shadow-xs dark:bg-[#282024] dark:text-[#F6F0EA]'
                      : 'text-[#6F5F5D] hover:text-[#342B2D] dark:text-[#C4B5B1] dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <label htmlFor="learn-search" className="sr-only">
                Search educational topics
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6F5F5D] dark:text-[#C4B5B1]"
                aria-hidden="true"
              />
              <input
                id="learn-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guides..."
                className="min-h-[44px] w-full rounded-xl border border-[#342B2D]/14 bg-white pr-4 pl-10 text-sm text-[#342B2D] placeholder:text-[#806F6D]/75 dark:border-[#F6F0EA]/14 dark:bg-[#282024] dark:text-[#F6F0EA]"
              />
            </div>
          </div>

          {/* Editorial Articles Grid */}
          {filteredArticles.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#342B2D]/18 p-10 text-center dark:border-[#F6F0EA]/18">
              <p className="text-sm text-[#6F5F5D] dark:text-[#C4B5B1]">
                No guides matched your search.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="font-ui mt-3 min-h-[44px] rounded-xl border border-[#342B2D]/15 px-4 py-2 text-xs font-medium text-[#342B2D] dark:border-[#F6F0EA]/15 dark:text-[#F6F0EA]"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {filteredArticles.map((article) => (
                <article
                  key={article.id}
                  className="group flex flex-col justify-between rounded-3xl border border-[#342B2D]/10 bg-white p-6 transition hover:-translate-y-0.5 hover:border-[#C58F98]/60 sm:p-7 dark:border-[#F6F0EA]/10 dark:bg-[#282024] dark:hover:border-[#D9A7AF]/45"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                      <span className="font-ui font-semibold text-[#705264] dark:text-[#D9A7AF]">
                        {article.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{article.readTime}</span>
                    </div>
                    <h2 className="mt-2.5 font-editorial text-2xl font-medium text-balance text-[#342B2D] dark:text-[#F6F0EA]">
                      {article.title}
                    </h2>
                    <p className="mt-2.5 text-sm leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
                      {article.summary}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-[#342B2D]/10 pt-4 dark:border-[#F6F0EA]/10">
                    <button
                      type="button"
                      onClick={() => setActiveArticleId(article.id)}
                      className="font-ui inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[#705264] transition group-hover:underline dark:text-[#D9A7AF]"
                    >
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                      <span>Read article</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
