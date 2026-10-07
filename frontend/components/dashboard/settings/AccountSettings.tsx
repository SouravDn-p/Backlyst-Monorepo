"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Mail, Pencil, Eye, EyeOff, X, Check, Upload, Camera } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { selectActiveTab, setActiveTab } from "@/redux/features/slice/authSlice";
import { useGetMeQuery, useChangePasswordMutation } from "@/redux/features/api/auth/authApi";
import { useUpdateProfileMutation } from "@/redux/features/api/settings/account/accountSettingsApi";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

export default function AccountInformation() {
  const router = useRouter();
  const { data: userResponse, isLoading, refetch } = useGetMeQuery();
  const user = userResponse?.data;

  const currentRole = useSelector(selectActiveTab);
  
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const [fullName, setFullName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (user) {
      setFullName(user.name || "");
      // Clear preview when user data loads
      if (!user.imageUrl) setPreviewUrl(null);
    }
  }, [user]);

  const email = user?.email || "";
  const currentImageUrl = user?.imageUrl || user?.image || null;

  // Password modal states
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const dispatch = useDispatch();

  const handleRoleSwitch = (newRole: "requester" | "provider") => {
    if (newRole === currentRole) return;
    router.push(`/dashboard`);
    dispatch(setActiveTab(newRole));
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error("Image size should be less than 5MB");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Upload profile image
  const handleUploadImage = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      await updateProfile(formData as any).unwrap(); 
      toast.success("Profile picture updated successfully!");
      
      // Cleanup
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelectedFile(null);
      
      // Refresh user data
      await refetch();
    } catch (error: any) {
      console.error("Failed to upload image:", error);
      toast.error(error?.data?.message || "Failed to upload profile picture");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveAccount = async () => {
    try {
      await updateProfile({ name: fullName }).unwrap();
      setIsEditingName(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile.");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match!");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    
    try {
      await changePassword({ oldPassword: currentPassword, newPassword }).unwrap();
      resetPasswordForm();
      toast.success("Password updated successfully!");
    } catch (error: any) {
      console.error("Failed to change password:", error);
      toast.error(error?.data?.message || "Failed to update password.");
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setShowChangePasswordModal(false);
  };

  const cancelImageUpload = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <>
      <div className="p-8 bg-white rounded-2xl overflow-hidden">
        {/* Header + Profile Photo */}
        <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-gray-100">
              {(previewUrl || currentImageUrl) ? (
                <Image
                  src={previewUrl || currentImageUrl!}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Camera className="w-10 h-10 text-gray-400" />
                </div>
              )}
            </div>

            {/* Upload Button Overlay */}
            <label className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-all active:scale-95">
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </label>
          </div>

          <div className="flex-1 pt-2">
            <h2 className="text-2xl font-semibold text-gray-900">Account Information</h2>
            <p className="mt-1.5 text-sm text-gray-600">
              Manage your personal account details and profile photo.
            </p>
          </div>
        </div>

        {previewUrl && (
          <div className="flex gap-3 mb-6">
            <Button onClick={handleUploadImage} disabled={isUploading} className="bg-green-600 hover:bg-green-700">
              {isUploading ? "Uploading..." : "Save Photo"}
            </Button>
            <Button variant="outline" onClick={cancelImageUpload}>
              Cancel
            </Button>
          </div>
        )}

        <div className="py-8 space-y-10">
          {/* Full Name */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <div className="relative">
              {isEditingName ? (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  autoFocus
                />
              ) : (
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-gray-900">{fullName}</span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Pencil size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="relative">
              <div className="flex items-center px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                <Mail size={18} className="mr-3 text-gray-500" />
                {email}
              </div>
            </div>
            <p className="text-xs text-gray-500 italic">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          {/* Password */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                onClick={() => setShowChangePasswordModal(true)}
              >
                Change Password
              </Button>
            </div>
          </div>

          {/* Role Switcher */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1 w-fit">
            <div className="relative flex items-center gap-1 bg-gray-100 rounded-full p-1">
              <span
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-primary shadow-md transition-all duration-300 ease-in-out ${
                  currentRole === "requester" ? "left-1" : "left-[calc(50%+2px)]"
                }`}
              />

              {(["requester", "provider"] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleSwitch(role)}
                  className={`relative z-10 flex items-center gap-1 lg:gap-2 cursor-pointer px-2 lg:px-4 py-2 rounded-full text-xs lg:text-sm font-medium transition-all duration-300 ease-out ${
                    currentRole === role
                      ? "text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span
                    className={`transition-all duration-300 ${
                      currentRole === role
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-90 w-0 overflow-hidden"
                    }`}
                  >
                    <Check className="w-3 h-3 lg:w-4 lg:h-4" />
                  </span>

                  <span className="hidden sm:inline px-1">
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </span>
                  <span className="sm:hidden">
                    {role === "requester" ? "Req" : "Pro"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Security Note + Save */}
          <div className="pt-6 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-start gap-3 text-sm text-gray-600">
              <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <p>All changes are logged for security purposes.</p>
            </div>

            <Button
              onClick={handleSaveAccount}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-medium shadow-md transition-all disabled:opacity-50"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={resetPasswordForm}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Change Password</h3>
              <button onClick={resetPasswordForm} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-6 space-y-6">
              {/* Current Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <Button type="button" variant="ghost" onClick={resetPasswordForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}