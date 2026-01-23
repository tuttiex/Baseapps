# Base News Carousel - Implementation Plan

## Overview
Add a horizontal scrolling news carousel on the Home page that displays the latest blog posts from the BaseApps Blog page.

## Goals
1. Display latest 3-5 blog posts in a horizontal scrolling carousel
2. Reuse blog content between Blog page and Home page
3. Click on news card to navigate to full blog post
4. Responsive design for mobile and desktop

---

## Implementation Steps

### Step 1: Extract Blog Data to Shared File
**File:** `frontend/src/data/blogPosts.js`

**Actions:**
- Create new data file to store blog posts
- Extract current blog post data from `Blog.jsx`
- Structure each post with:
  - `id`: unique identifier
  - `title`: article headline
  - `excerpt`: short description
  - `content`: full article text (for blog page)
  - `image`: featured image URL or path
  - `slug`: URL-friendly identifier (e.g., "neynar-acquires-farcaster")
  - `category`: optional category tag

**Data Structure:**
```javascript
export const blogPosts = [
  {
    id: 1,
    title: "Article Title",
    excerpt: "Short description...",
    image: "/path/to/image.jpg",
    slug: "article-slug",
    category: "Technology",
    date: "2026-01-23",
    content: "Full article content..."
  },
  // ... more posts
]
```

---

### Step 2: Update Blog Page to Use Shared Data
**File:** `frontend/src/Blog.jsx`

**Actions:**
- Import `blogPosts` from the new data file
- Replace hardcoded posts with imported data
- Use `.map()` to render blog grid
- Set up routing to individual blog posts using slug

---

### Step 3: Create News Card Component
**File:** `frontend/src/components/NewsCard.jsx`

**Actions:**
- Create reusable card component for news items
- Props: `post` object (title, image, excerpt, slug)
- Display:
  - Featured image (top)
  - Article title
  - Brief excerpt (2-3 lines max)
- Click handler to navigate to `/blog/${post.slug}`
- Styling:
  - Dark card with border
  - Rounded corners
  - Hover effect (scale/shadow)
  - Fixed width (e.g., 320px)

---

### Step 4: Create News Carousel Component
**File:** `frontend/src/components/NewsCarousel.jsx`

**Actions:**
- Import latest 3-5 posts from `blogPosts`
- Horizontal scroll container
- Display `NewsCard` components
- Features:
  - Smooth horizontal scrolling
  - Navigation arrows (left/right)
  - Scroll snap points
  - Hide scrollbar but keep functionality
  - Responsive: stack on mobile, horizontal on desktop

**Styling approach:**
```css
.news-carousel {
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
}

.news-card {
  scroll-snap-align: start;
  min-width: 320px;
  flex-shrink: 0;
}
```

---

### Step 5: Add Carousel to Home Page
**File:** `frontend/src/Home.jsx`

**Actions:**
- Import `NewsCarousel` component
- Place inside existing "Base News Section" (after description)
- Add container padding and styling
- Ensure section has enough vertical space

**Location:**
```jsx
{/* Base News Section */}
<section className="base-news-section">
  <div className="container">
    <h2>Base News</h2>
    <p>Latest Base news and updates</p>
    
    {/* NEW: Add carousel here */}
    <NewsCarousel />
  </div>
</section>
```

---

### Step 6: Add Individual Blog Post Page (Optional)
**File:** `frontend/src/pages/BlogPost.jsx`

**Actions:**
- Create single blog post view
- Use slug to find and display full post
- Show full content, image, title
- Add back button to return to blog page

**Routing:**
- Add route: `/blog/:slug`
- Update `App.jsx` with new route

---

### Step 7: Style News Carousel
**File:** `frontend/src/App.css` or create `frontend/src/components/NewsCarousel.css`

**Actions:**
- Dark theme card styling
- Purple accents on hover
- Smooth animations
- Responsive breakpoints
- Hide scrollbar styling:
  ```css
  .news-carousel::-webkit-scrollbar {
    display: none;
  }
  ```

---

### Step 8: Add Navigation Arrows
**Enhancement to:** `NewsCarousel.jsx`

**Actions:**
- Add left/right arrow buttons
- Position absolutely over carousel
- Implement scroll logic:
  ```javascript
  const scroll = (direction) => {
    const distance = 340; // card width + gap
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth'
    });
  };
  ```
- Hide arrows when at start/end of carousel
- Use SVG arrow icons from `Icons.jsx`

---

### Step 9: Make Cards Clickable
**Enhancement to:** `NewsCard.jsx`

**Actions:**
- Wrap card in `Link` from react-router-dom
- Link to: `/blog#${post.slug}` or `/blog/${post.slug}`
- Add cursor pointer
- Ensure click area covers entire card

---

### Step 10: Add Placeholder Images
**Optional:** Generate images for blog posts

**Actions:**
- Use `generate_image` tool to create featured images for each post
- Or use placeholder service like `https://via.placeholder.com/400x250`
- Save images to `frontend/public/blog/` folder
- Update blog post data with image paths

---

## File Structure
```
frontend/
├── src/
│   ├── data/
│   │   └── blogPosts.js          # NEW: Shared blog data
│   ├── components/
│   │   ├── NewsCard.jsx          # NEW: Single news card
│   │   ├── NewsCarousel.jsx      # NEW: Horizontal carousel
│   │   └── NewsCarousel.css      # NEW: Carousel styles
│   ├── pages/
│   │   └── BlogPost.jsx          # NEW (Optional): Single post view
│   ├── Blog.jsx                  # MODIFIED: Use shared data
│   ├── Home.jsx                  # MODIFIED: Add carousel
│   └── App.jsx                   # MODIFIED: Add blog post route
└── public/
    └── blog/                     # NEW: Blog images folder
        ├── post-1.jpg
        └── post-2.jpg
```

---

## Testing Checklist
- [ ] Blog posts display correctly on Blog page
- [ ] Latest 3-5 posts appear in Home carousel
- [ ] Horizontal scrolling works smoothly
- [ ] Arrow navigation functions properly
- [ ] Clicking card navigates to blog post
- [ ] Responsive on mobile (vertical stack or smaller cards)
- [ ] Hover effects work correctly
- [ ] Images load properly
- [ ] No console errors

---

## Future Enhancements
1. **Backend Integration:** Replace data file with API endpoint
2. **CMS:** Add admin interface to create/edit blog posts
3. **Categories:** Filter news by category
4. **Search:** Add search within blog posts
5. **Auto-scroll:** Automatic carousel rotation
6. **Loading States:** Skeleton screens while loading
7. **Infinite Scroll:** Load more posts as user scrolls

---

## Notes
- Keep carousel lightweight (only latest posts)
- Ensure images are optimized (webp format, compressed)
- Consider lazy loading images
- Test scroll performance on mobile devices
