'use client';

import dynamic from 'next/dynamic';

// ChatBox is a floating widget, not needed for first paint/SEO on any route -
// deferring it keeps it out of every page's initial JS.
const ChatBox = dynamic(() => import('@/components/ChatBox'), { ssr: false });

export default ChatBox;
