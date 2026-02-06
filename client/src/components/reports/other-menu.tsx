import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Globe, Power, ChevronRight, Lock, Eye, EyeOff } from "lucide-react"; // Added Eye and EyeOff icons
import { useTranslation, useLanguageStore, type Language } from "@/lib/i18n";
import logoPath from "@assets/EDPOS_1753091767028.png";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { StoreSettings } from "@shared/schema";

interface OtherMenuProps {
  onBack: () => void;
  onLogout: () => void;
}

export function OtherMenu({ onBack, onLogout }: OtherMenuProps) {
  const { t, currentLanguage } = useTranslation();
  const { setLanguage } = useLanguageStore();
  const queryClient = useQueryClient();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { toast } = useToast();

  // State for toggling password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch store settings
  const { data: storeSettings } = useQuery<StoreSettings>({
    queryKey: ["https://api-laundry-mobile.edpos.vn/api/store-settings"],
  });

  // storeSettings is a single object, not an array
  const adminSetting = storeSettings?.isAdmin ? storeSettings : null;

  const languages = [
    { code: "vi" as Language, name: "Tiếng Việt", flag: "🇻🇳" },
    { code: "en" as Language, name: "English", flag: "🇺🇸" },
    { code: "ko" as Language, name: "한국어", flag: "🇰🇷" },
  ];

  const getCurrentLanguage = () => {
    return (
      languages.find((lang) => lang.code === currentLanguage) || languages[0]
    );
  };

  const handleLanguageSelect = (langCode: Language) => {
    setLanguage(langCode);
    setShowLanguageModal(false);
    // Force a re-render by reloading the page to ensure all translations are updated
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);

    // Clear authentication state from sessionStorage
    sessionStorage.removeItem("pinAuthenticated");
    localStorage.removeItem("dashboard-date-range");

    // Call the logout callback
    onLogout();

    // Reload the page to return to PIN authentication screen
    window.location.reload();
  };

  // Mutation to update store settings
  const updatePasswordMutation = useMutation({
    mutationFn: async (newPinCode: string) => {
      if (!storeSettings?.id) throw new Error("Store settings not found");
      const response = await fetch(`https://api-laundry-mobile.edpos.vn/api/store-settings/${storeSettings.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinCode: newPinCode }),
      });
      if (!response.ok) throw new Error("Failed to update password");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["https://api-laundry-mobile.edpos.vn/api/store-settings"] });
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      toast({
        title: "Thành công",
        description: "Mật khẩu đã được thay đổi.",
      });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi đổi mật khẩu.",
        variant: "destructive",
      });
    },
  });

  // Password change handlers
  const handlePasswordChange = () => {
    if (!storeSettings) {
      setPasswordError("Không tìm thấy cài đặt quản trị.");
      return;
    }
    if (currentPassword !== storeSettings.pinCode) {
      setPasswordError("Mật khẩu hiện tại không đúng.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu mới không khớp.");
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError("Mật khẩu mới phải có ít nhất 4 ký tự.");
      return;
    }

    updatePasswordMutation.mutate(newPassword);
  };

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-green-700"
            onClick={() => {
              // Clear URL parameters when going back
              if (window.location.search) {
                const url = new URL(window.location.href);
                url.search = "";
                window.history.pushState({}, "", url.toString());
              }
              onBack();
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">{t("nav.other") || "KHÁC"}</h1>
        </div>
        <div className="flex items-center">
          <img
            src={logoPath}
            alt="EDPOS Logo"
            className="h-8 md:h-12 object-contain"
            onError={(e) => {
              console.error("Failed to load logo image");
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-4 space-y-3">
        {/* Language Settings */}
        <Card
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setShowLanguageModal(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Globe className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {t("settings.changeLanguage") || "Thiết lập ngôn ngữ"}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setShowPasswordModal(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Lock className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {t("settings.changePassword") || "Đổi mật khẩu"}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={handleLogoutClick}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Power className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {t("nav.logout") || "Đăng xuất"}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Language Selection Modal */}
      <Dialog open={showLanguageModal} onOpenChange={setShowLanguageModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="bg-green-600 text-white p-4 -m-6 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-green-700"
                  onClick={() => setShowLanguageModal(false)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <DialogTitle className="text-lg font-semibold">
                  {t("settings.changeLanguage") || "Thiết lập ngôn ngữ"}
                </DialogTitle>
              </div>
              <div className="flex items-center">
                <img
                  src={logoPath}
                  alt="EDPOS Logo"
                  className="h-8 md:h-12 object-contain"
                  onError={(e) => {
                    console.error("Failed to load logo image");
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-2 -mt-2">
            {languages.map((lang) => (
              <div
                key={lang.code}
                className={`p-4 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                  currentLanguage === lang.code
                    ? "bg-green-50 border border-green-200"
                    : ""
                }`}
                onClick={() => handleLanguageSelect(lang.code)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{lang.flag}</span>
                  <div>
                    <div className="font-medium text-gray-900">
                      {lang.code.toUpperCase()}{" "}
                      <span className="text-gray-600">{lang.name}</span>
                    </div>
                  </div>
                  {currentLanguage === lang.code && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="bg-green-600 text-white p-4 -m-6 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-green-700"
                  onClick={() => setShowPasswordModal(false)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <DialogTitle className="text-lg font-semibold">
                  {t("settings.changePassword") || "Đổi mật khẩu"}
                </DialogTitle>
              </div>
              <div className="flex items-center">
                <img
                  src={logoPath}
                  alt="EDPOS Logo"
                  className="h-8 md:h-12 object-contain"
                  onError={(e) => {
                    console.error("Failed to load logo image");
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {passwordError && (
              <p className="text-red-500 text-center">{passwordError}</p>
            )}
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("settings.currentPassword") || "Mật khẩu hiện tại"}
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("settings.newPassword") || "Mật khẩu mới"}
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("settings.confirmNewPassword") || "Xác nhận mật khẩu mới"}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-3 justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordModal(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setPasswordError("");
              }}
              className="px-6"
            >
              {t("common.cancel") || "Hủy"}
            </Button>
            <Button
              onClick={handlePasswordChange}
              className="px-6 bg-blue-600 hover:bg-blue-700"
            >
              {t("settings.changePassword") || "Đổi mật khẩu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Modal */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("nav.logout") || "Đăng xuất"}
            </h3>
            <p className="text-gray-600 mb-6">
              {t("common.confirmLogout") ||
                "Bạn có chắc chắn muốn đăng xuất không?"}
            </p>
            <DialogFooter className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-6"
              >
                {t("common.cancel") || "Hủy"}
              </Button>
              <Button
                onClick={confirmLogout}
                className="px-6 bg-blue-600 hover:bg-blue-700"
              >
                {t("nav.logout") || "Đăng xuất"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}