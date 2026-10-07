import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';

class ApplyTaskScreen extends StatelessWidget {
  final Map<String, dynamic> task;

  const ApplyTaskScreen({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Apply Details', style: TextStyle(color: AppColors.textPrimary)),
        leading: const BackButton(color: AppColors.textPrimary),
      ),
      body: Padding(
         padding: EdgeInsets.all(24.w),
         child: Column(
           crossAxisAlignment: CrossAxisAlignment.start,
           children: [
             Text(
               task['title'] ?? 'Task Title',
               style: TextStyle(
                 fontSize: 22.sp,
                 fontWeight: FontWeight.bold,
                 color: AppColors.textPrimary,
               ),
             ),
             Gap(8.h),
             Text(
               'Budget: \$${task['price']}',
               style: TextStyle(
                 fontSize: 18.sp,
                 fontWeight: FontWeight.bold,
                 color: AppColors.primary,
               ),
             ),
             Gap(32.h),
             Text(
               'Cover Letter',
               style: TextStyle(
                 fontSize: 16.sp,
                 fontWeight: FontWeight.bold,
                 color: AppColors.textPrimary,
               ),
             ),
             Gap(12.h),
             Container(
               height: 150.h,
               decoration: BoxDecoration(
                 color: AppColors.surface,
                 borderRadius: BorderRadius.circular(16.r),
               ),
               child: TextField(
                  maxLines: 6,
                  decoration: InputDecoration(
                    hintText: 'Introduce yourself and explain why you are a good fit for this task...',
                    hintStyle: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.all(20.w),
                  ),
               ),
             ),
             const Spacer(),
             PrimaryButton(
               text: 'Submit Application',
               onPressed: () {
                 Navigator.pop(context);
                 ScaffoldMessenger.of(context).showSnackBar(
                   const SnackBar(content: Text('Application Submitted!')),
                 );
               },
             ),
             Gap(20.h),
           ],
         ),
      ),
    );
  }
}
