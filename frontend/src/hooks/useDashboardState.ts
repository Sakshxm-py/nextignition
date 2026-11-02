import { useState } from 'react';

export function useDashboardState(defaultTab: string = 'Home Feed') {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleSidebarCollapse = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const toggleAI = () => setIsAIOpen(!isAIOpen);
  const toggleNotifications = () => setIsNotificationsOpen(!isNotificationsOpen);
  const closeNotifications = () => setIsNotificationsOpen(false);

  return {
    activeTab,
    setActiveTab,
    isSidebarOpen,
    setIsSidebarOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isAIOpen,
    setIsAIOpen,
    isNotificationsOpen,
    setIsNotificationsOpen,
    toggleSidebar,
    closeSidebar,
    toggleSidebarCollapse,
    toggleAI,
    toggleNotifications,
    closeNotifications,
  };
}
