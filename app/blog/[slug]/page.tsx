/**
 * Dynamic blog post page
 * Route: /blog/[slug]
 */

import React from 'react';

export default function BlogPost({ params = {}, query = {} }: { params?: Record<string, string>, query?: Record<string, string> }) {
  const { slug = '' } = params;
  
  // In a real app, you'd fetch the blog post data here
  const posts: Record<string, { title: string; content: string; date: string }> = {
    'hello-world': {
      title: 'Hello World - First Post!',
      content: 'This is the first blog post on Bunbox. Notice how the URL parameter "hello-world" is automatically extracted from the route [slug] and passed to this component.',
      date: '2024-01-01'
    },
    'bunbox-tutorial': {
      title: 'Getting Started with Bunbox',
      content: 'Bunbox makes it incredibly easy to build full-stack applications with React, API routes, and WebSockets. Just create files in the app directory and they automatically become routes!',
      date: '2024-01-02'
    }
  };
  
  const post = posts[slug] || {
    title: 'Post Not Found',
    content: `The blog post "${slug}" doesn't exist yet. Try one of these: hello-world, bunbox-tutorial`,
    date: 'N/A'
  };
  
  return (
    <div className="card">
      <div style={{ marginBottom: '1rem', color: '#666' }}>
        📅 {post.date}
      </div>
      <h1>{post.title}</h1>
      <div style={{ marginTop: '1.5rem', lineHeight: '1.8' }}>
        {post.content}
      </div>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
        <strong>Route Info:</strong>
        <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
          <li>Slug: <code>{slug}</code></li>
          <li>File: <code>/app/blog/[slug]/page.tsx</code></li>
          <li>Query params: <code>{JSON.stringify(query)}</code></li>
        </ul>
      </div>
      
      <div style={{ marginTop: '1.5rem' }}>
        <a href="/" style={{ color: '#0066cc' }}>← Back to Home</a>
      </div>
    </div>
  );
}

