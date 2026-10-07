import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';

class ProviderProfileScreen extends StatelessWidget {
  final Map<String, dynamic> provider;

  const ProviderProfileScreen({super.key, required this.provider});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 200.h,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Image.network(
                'https://via.placeholder.com/400x200',
                fit: BoxFit.cover,
              ),
            ),
            leading: const BackButton(
               style: ButtonStyle(
                 backgroundColor: MaterialStatePropertyAll(Colors.black26),
                 foregroundColor: MaterialStatePropertyAll(Colors.white),
               ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(24.w),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          provider['name'] ?? 'Provider Name',
                          style: TextStyle(
                            fontSize: 24.sp,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                         decoration: BoxDecoration(
                           color: Colors.amber.withAlpha(25),
                           borderRadius: BorderRadius.circular(20.r),
                         ),
                         child: Row(
                           children: [
                             Icon(Icons.star, color: Colors.amber, size: 16.sp),
                             Gap(4.w),
                             Text(
                               '${provider['rating']}',
                               style: TextStyle(
                                 fontSize: 14.sp,
                                 fontWeight: FontWeight.bold,
                                 color: Colors.amber[800],
                               ),
                             ),
                           ],
                         ),
                      ),
                    ],
                  ),
                  Gap(16.h),
                  Text(
                    'About',
                    style: TextStyle(
                      fontSize: 18.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Gap(8.h),
                  Text(
                    'We are a leading media company focusing on technology and innovation. We provide high-quality content placement and review services.',
                    style: TextStyle(
                      fontSize: 14.sp,
                      color: AppColors.textSecondary,
                      height: 1.5,
                    ),
                  ),
                  Gap(24.h),
                  Text(
                    'Services',
                    style: TextStyle(
                      fontSize: 18.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Gap(12.h),
                  _buildServiceItem('Guest Post', '\$150.00'),
                  _buildServiceItem('Product Review', '\$200.00'),
                  _buildServiceItem('Social Media Shoutout', '\$50.00'),
                  
                  Gap(40.h),
                  PrimaryButton(
                    text: 'Invite to Task',
                    onPressed: () {
                      // Open invite modal
                    },
                  ),
                  Gap(16.h),
                  SizedBox(
                    width: double.infinity,
                    height: 56.h,
                    child: OutlinedButton(
                       onPressed: () {},
                       style: OutlinedButton.styleFrom(
                         side: const BorderSide(color: AppColors.primary),
                         shape: RoundedRectangleBorder(
                           borderRadius: BorderRadius.circular(16.r),
                         ),
                       ),
                       child: Text(
                         'Message Provider',
                         style: TextStyle(
                           fontSize: 16.sp,
                           fontWeight: FontWeight.w600,
                           color: AppColors.primary,
                         ),
                       ),
                    ),
                  ),
                   Gap(20.h),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildServiceItem(String title, String price) {
    return Container(
      margin: EdgeInsets.only(bottom: 12.h),
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12.r),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary,
            ),
          ),
          Text(
            price,
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }
}
