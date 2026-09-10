import React, { useState, useEffect } from 'react';
import { EventItem, SiteSettings } from './types';
import { defaultSettings } from './data/defaultSettings';
import { defaultEvents } from './data/defaultEvents';
import { fetchPublicEvents, fetchPublicSettings } from './services/api';
import { useAppRoute } from './utils/router';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { TicketLookupPage } from './pages/TicketLookupPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { LoadingScreen } from './components/LoadingScreen';

export default function App() {
  const [route, navigate] = useAppRoute();
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [events, setEvents] = useState<EventItem[]>(defaultEvents);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialReady, setIsInitialReady] = useState(false);

  const loadSettings = async () => {
    try {
      const data = await fetchPublicSettings();
      if (data && data.symposiumTitle) {
        setSettings(data);
      }
    } catch (err) {
      console.warn('Using default settings fallback:', err);
    }
  };

  const loadEvents = async () => {
    try {
      const data = await fetchPublicEvents();
      if (data && Array.isArray(data) && data.length > 0) {
        setEvents(data);
      }
    } catch (err) {
      console.warn('Using default events fallback:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.allSettled([loadSettings(), loadEvents()]);
      } finally {
        setIsInitialReady(true);
      }
    };
    init();
  }, []);

  // Determine current active page
  const renderCurrentPage = () => {
    if (route.path === '/register') {
      return (
        <RegistrationPage
          events={events}
          settings={settings}
          onNavigate={navigate}
        />
      );
    }

    if (route.path === '/ticket') {
      return (
        <TicketLookupPage
          initialRegId={route.regId}
          settings={settings}
          onNavigate={navigate}
        />
      );
    }

    if (route.path === '/admin') {
      return (
        <AdminDashboard
          initialSettings={settings}
          events={events}
          onRefreshEvents={loadEvents}
          onRefreshSettings={loadSettings}
          onNavigate={navigate}
        />
      );
    }

    if (route.path === '/events' && route.category) {
      return (
        <CategoryPage
          category={route.category}
          events={events}
          onNavigate={navigate}
        />
      );
    }

    if (route.path === '/event-detail') {
      const foundEvent = events.find(
        (e) =>
          e.slug === route.slug ||
          e.id === route.slug ||
          e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === route.slug
      );

      if (foundEvent) {
        return <EventDetailPage event={foundEvent} onNavigate={navigate} />;
      }

      // Fallback if slug not found
      return (
        <div className="py-20 text-center max-w-md mx-auto px-4">
          <h2 className="text-xl font-bold text-stone-900 mb-2">Event Not Found</h2>
          <p className="text-xs text-stone-500 mb-6">
            The event you are looking for may have been updated or moved.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-stone-900 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Return to Homepage
          </button>
        </div>
      );
    }

    // Default: Home Page
    return (
      <HomePage
        settings={settings}
        events={events}
        onNavigate={navigate}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-stone-900 selection:bg-red-100 selection:text-[#B22222]">
      {/* Mobile-first Premium Initial Technical Loading Screen */}
      <LoadingScreen isAppReady={isInitialReady} />

      {/* Top Navigation */}
      <Navbar
        settings={settings}
        currentPath={route.path + (route.category ? `/${route.category}` : '')}
        onNavigate={navigate}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {renderCurrentPage()}
      </main>

      {/* Footer */}
      <Footer settings={settings} onNavigate={navigate} />
    </div>
  );
}
