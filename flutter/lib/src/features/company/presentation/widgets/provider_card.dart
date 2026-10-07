import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';

class ProviderCard extends StatelessWidget {
  final Map<String, dynamic> provider;
  final VoidCallback onTap;

  const ProviderCard({
    super.key,
    required this.provider,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(16.w),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16.r),
          boxShadow: [
            BoxShadow(
               color: Colors.black.withAlpha(10), // Fixed withAlpha
               blurRadius: 10,
               offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 60.w,
              height: 60.w,
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(12.r),
                image: const DecorationImage(
                  image: NetworkImage('https://via.placeholder.com/150'),
                  fit: BoxFit.cover,
                ),
              ),
            ),
            Gap(16.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    provider['name'] ?? 'Provider Name',
                    style: TextStyle(
                      fontSize: 18.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Gap(4.h),
                  Row(
                    children: [
                      Icon(Icons.star, color: Colors.amber, size: 16.sp),
                      Gap(4.w),
                      Text(
                        '${provider['rating'] ?? 5.0}',
                        style: TextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Gap(4.w),
                      Text(
                        '(${provider['reviews'] ?? 0} reviews)',
                        style: TextStyle(
                          fontSize: 12.sp,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  Gap(4.h),
                  Wrap(
                    spacing: 8.w,
                    children: (provider['tags'] as List<String>? ?? []).take(2).map((tag) {
                      return Container(
                        padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withAlpha(25),
                          borderRadius: BorderRadius.circular(4.r),
                        ),
                        child: Text(
                          tag,
                          style: TextStyle(
                            fontSize: 10.sp,
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, size: 16.sp, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }
}
