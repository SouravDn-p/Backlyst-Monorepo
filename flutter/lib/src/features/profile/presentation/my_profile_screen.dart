import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'widgets/profile_stat_card.dart';

class MyProfileScreen extends StatelessWidget {
  const MyProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile', style: TextStyle(color: AppColors.textPrimary)),
        leading: const BackButton(color: AppColors.textPrimary),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit, color: AppColors.primary),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            Gap(20.h),
             Stack(
               children: [
                 CircleAvatar(
                   radius: 50.r,
                   backgroundImage: const NetworkImage('https://via.placeholder.com/150'),
                 ),
                 Positioned(
                   bottom: 0,
                   right: 0,
                   child: Container(
                     padding: EdgeInsets.all(8.w),
                     decoration: const BoxDecoration(
                       color: AppColors.primary,
                       shape: BoxShape.circle,
                     ),
                     child: Icon(Icons.camera_alt, color: Colors.white, size: 16.w),
                   ),
                 ),
               ],
             ),
             Gap(16.h),
             Text(
               'John Doe',
               style: TextStyle(
                 fontSize: 22.sp,
                 fontWeight: FontWeight.bold,
                 color: AppColors.textPrimary,
               ),
             ),
             Text(
               'SEO Specialist & Content Writer',
               style: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
             ),
             Gap(24.h),
             Padding(
               padding: EdgeInsets.symmetric(horizontal: 24.w),
               child: const Row(
                 children: [
                   ProfileStatCard(label: 'Earnings', value: '\$2.5k', icon: Icons.monetization_on),
                   SizedBox(width: 16),
                   ProfileStatCard(label: 'Jobs', value: '18', icon: Icons.work),
                   SizedBox(width: 16),
                   ProfileStatCard(label: 'Rating', value: '4.9', icon: Icons.star),
                 ],
               ),
             ),
             Gap(32.h),
             _buildSection(
               'About Me',
               'I am a professional SEO specialist with over 5 years of experience in helping businesses grow their online presence.',
             ),
             _buildSection(
               'Skills',
               'SEO, Content Writing, Link Building, Keyword Research',
             ),
             _buildSection(
               'Portfolio',
               'https://johndoe.com/portfolio',
               isLink: true,
             ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(String title, String content, {bool isLink = false}) {
    return Container(
      width: double.infinity,
      margin: EdgeInsets.only(bottom: 24.h),
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 18.sp,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          Gap(8.h),
          Text(
            content,
            style: TextStyle(
              fontSize: 14.sp,
              color: isLink ? AppColors.primary : AppColors.textSecondary,
              decoration: isLink ? TextDecoration.underline : TextDecoration.none,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
