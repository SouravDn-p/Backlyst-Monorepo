import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';
import 'widgets/profile_stat_card.dart';

class RequesterProfileScreen extends StatelessWidget {
  const RequesterProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Requester Profile', style: TextStyle(color: AppColors.textPrimary)),
        leading: const BackButton(color: AppColors.textPrimary),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Gap(20.h),
            CircleAvatar(
              radius: 50.r,
              backgroundImage: const NetworkImage('https://via.placeholder.com/150'),
            ),
            Gap(16.h),
            Text(
              'Alice Smith',
              style: TextStyle(
                fontSize: 22.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              'Marketing Director at TechCorp',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
            ),
            Gap(24.h),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 24.w),
              child: const Row(
                children: [
                  ProfileStatCard(label: 'Posted', value: '42', icon: Icons.post_add),
                  SizedBox(width: 16),
                  ProfileStatCard(label: 'Approval', value: '98%', icon: Icons.thumb_up),
                ],
              ),
            ),
            Gap(32.h),
            _buildSectionTitle('Active Tasks'),
            _buildTaskList(),
            Gap(20.h),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 24.w),
              child: PrimaryButton(
                text: 'Contact Requester',
                onPressed: () {},
              ),
            ),
            Gap(40.h),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          title,
          style: TextStyle(
            fontSize: 18.sp,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
      ),
    );
  }

  Widget _buildTaskList() {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: EdgeInsets.all(24.w),
      itemCount: 2,
      itemBuilder: (context, index) {
        return Container(
          margin: EdgeInsets.only(bottom: 16.h),
          padding: EdgeInsets.all(16.w),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12.r),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(5),
                 blurRadius: 5,
                 offset: const Offset(0, 2),
              ),
            ],
          ),
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(
              'SEO Article Writing',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16.sp),
            ),
             subtitle: Text('\$120.00 • Posted 2 days ago'),
             trailing: const Icon(Icons.arrow_forward_ios, size: 16),
          ),
        );
      },
    );
  }
}
