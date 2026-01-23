// Shared blog posts data for BaseApps Blog
// Add new posts to the top of the array (latest first)

export const blogPosts = [
    {
        id: 1,
        title: "Welcome to BaseApps Blog",
        excerpt: "Discover the latest updates, insights, and stories from the Base ecosystem. We're here to share news, tutorials, and community highlights.",
        content: `
            Welcome to the official BaseApps Blog! We're excited to launch this platform where we'll be sharing:
            
            - Latest news from the Base ecosystem
            - Tutorials and guides for developers
            - Community highlights and success stories
            - Updates about new dapps and protocols
            - Insights into the growing Base network
            
            Stay tuned for regular content that will help you navigate and make the most of the Base ecosystem.
        `,
        date: "January 21, 2026",
        author: "BaseApps Team",
        category: "Announcement",
        slug: "welcome-to-baseapps-blog",
        image: "/Baseappslogo3.png",
        featured: true
    },
    {
        id: 2,
        title: "Getting Started with Base Network",
        excerpt: "Learn how to connect your wallet, bridge assets, and start exploring the fastest-growing Layer 2 ecosystem on Ethereum.",
        content: `
            Base is Coinbase's Layer 2 network built on Ethereum, offering fast and low-cost transactions.
            
            Here's how to get started:
            
            1. Connect your wallet (MetaMask, Coinbase Wallet, or RainbowKit)
            2. Bridge assets from Ethereum to Base
            3. Explore dapps in the ecosystem
            4. Start building or using DeFi protocols
            
            Base offers the security of Ethereum with the speed and affordability of a Layer 2.
        `,
        date: "January 20, 2026",
        author: "Community",
        category: "Tutorial",
        slug: "getting-started-with-base-network",
        image: "/Baseappslogo3.png",
        featured: false
    },
    {
        id: 3,
        title: "Top DeFi Apps on Base",
        excerpt: "Explore the most popular decentralized finance applications building on Base, from DEXs to lending protocols.",
        content: `
            The Base ecosystem is growing rapidly with numerous DeFi applications:
            
            - Decentralized Exchanges (DEXs)
            - Lending and borrowing protocols
            - Yield farming platforms
            - NFT marketplaces
            - Gaming and metaverse projects
            
            Discover the top dapps on BaseApps and start exploring the ecosystem today!
        `,
        date: "January 18, 2026",
        author: "BaseApps Team",
        category: "Ecosystem",
        slug: "top-defi-apps-on-base",
        image: "/Baseappslogo3.png",
        featured: false
    }
];

// Helper function to get latest posts (for carousel)
export const getLatestPosts = (count = 5) => {
    return blogPosts.slice(0, count);
};

// Helper function to get post by slug
export const getPostBySlug = (slug) => {
    return blogPosts.find(post => post.slug === slug);
};
