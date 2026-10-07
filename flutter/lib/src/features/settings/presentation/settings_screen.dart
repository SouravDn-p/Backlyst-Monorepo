import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings', style: TextStyle(color: AppColors.textPrimary)),
        leading: const BackButton(color: AppColors.textPrimary),
      ),
      body: ListView(
        padding: EdgeInsets.all(24.w),
        children: [
          _buildSectionHeader('Account'),
          _buildSettingsTile(Icons.person_outline, 'Profile Information', onTap: () {}),
          _buildSettingsTile(Icons.lock_outline, 'Security & Password', onTap: () {}),
          _buildSettingsTile(Icons.verified_user_outlined, 'KYC Verification', onTap: () {}),
          
          Gap(32.h),
          _buildSectionHeader('Preferences'),
          _buildSettingsTile(Icons.notifications_none, 'Notifications', onTap: () {}),
          _buildSettingsTile(Icons.language, 'Language', trailing: 'English', onTap: () {}),
          _buildSettingsTile(Icons.dark_mode_outlined, 'Dark Mode', isSwitch: true, onTap: () {}),
          
          Gap(32.h),
          _buildSectionHeader('Support'),
          _buildSettingsTile(Icons.help_outline, 'Help Center', onTap: () {}),
          _buildSettingsTile(Icons.privacy_tip_outlined, 'Privacy Policy', onTap: () {}),
          _buildSettingsTile(Icons.description_outlined, 'Terms of Service', onTap: () {}),
          
          Gap(32.h),
          TextButton(
            onPressed: () {},
            child: Text(
              'Delete Account',
              style: TextStyle(color: Colors.red, fontSize: 14.sp),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: EdgeInsets.only(bottom: 12.h),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 14.sp,
          fontWeight: FontWeight.bold,
          color: AppColors.primary,
          letterSpacing: 1.0,
        ),
      ),
    );
  }

  Widget _buildSettingsTile(IconData icon, String title, {String? trailing, bool isSwitch = false, VoidCallback? onTap}) {
    return Container(
      margin: EdgeInsets.only(bottom: 12.h),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        onTap: isSwitch ? null : onTap,
        leading: Icon(icon, color: AppColors.textSecondary),
        title: Text(
          title,
          style: TextStyle(
            fontSize: 16.sp,
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w500,
          ),
        ),
        trailing: isSwitch
            ? Switch(value: false, onChanged: (v) {})
            : trailing != null
                ? Text(trailing, style: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp))
                : Icon(Icons.arrow_forward_ios, size: 16.sp, color: AppColors.textSecondary),
      ),
    );
  }
}
