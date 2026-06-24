import site from '../../content/site.json';
import homePage from '../../content/pages/home.json';
import aboutPage from '../../content/pages/about.json';
import bookPage from '../../content/pages/book.json';
import leads from '../../content/leads.json';

const journeyModules = import.meta.glob('../../content/journeys/*.json', { eager: true });
const journeys = Object.values(journeyModules)
  .map((module) => module.default ?? module)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const postModules = import.meta.glob('../../content/blog/*.md', { eager: true });
const posts = Object.entries(postModules)
  .map(([path, module]) => {
    const frontmatter = module.frontmatter ?? {};
    const slug = frontmatter.slug || path.split('/').pop().replace(/\.md$/, '');
    const Content = module.default ?? module;

    return {
      ...frontmatter,
      slug,
      Content
    };
  })
  .sort((a, b) => new Date(b.date) - new Date(a.date));

const getJourneyBySlug = (slug) => journeys.find((journey) => journey.slug === slug);
const getPostBySlug = (slug) => posts.find((post) => post.slug === slug);

export { site, homePage, aboutPage, bookPage, leads, journeys, posts, getJourneyBySlug, getPostBySlug };
