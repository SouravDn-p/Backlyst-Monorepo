import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';
import 'verification_step_3_screen.dart';

class VerificationStep2Screen extends StatefulWidget {
  const VerificationStep2Screen({super.key});

  @override
  State<VerificationStep2Screen> createState() => _VerificationStep2ScreenState();
}

class _VerificationStep2ScreenState extends State<VerificationStep2Screen> {
  int _selectedMethod = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: AppColors.textPrimary),
        title: Text(
          'Verification Step 2',
          style: TextStyle(color: AppColors.textPrimary, fontSize: 18.sp),
        ),
      ),
      body: Padding(
        padding: EdgeInsets.all(24.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Choose Verification Method',
              style: TextStyle(
                fontSize: 22.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Gap(32.h),
            _buildMethodOption(0, 'DNS Record', 'Add a TXT record to your DNS settings'),
            Gap(16.h),
            _buildMethodOption(1, 'HTML File', 'Upload an HTML file to your root directory'),
             Gap(16.h),
            _buildMethodOption(2, 'Meta Tag', 'Add a meta tag to your homepage head'),
            
            const Spacer(),
            PrimaryButton(
              text: 'Continue',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const VerificationStep3Screen(),
                  ),
                );
              },
            ),
            Gap(20.h),
          ],
        ),
      ),
    );
  }

  Widget _buildMethodOption(int index, String title, String subtitle) {
    final isSelected = _selectedMethod == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedMethod = index),
      child: Container(
        padding: EdgeInsets.all(16.w),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withAlpha(20) : AppColors.surface,
          borderRadius: BorderRadius.circular(12.r),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
              color: isSelected ? AppColors.primary : AppColors.textSecondary,
            ),
            Gap(16.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12.sp,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
