import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/custom_text_field.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';
import 'verification/verification_step_1_screen.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 24.w),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Gap(40.h),
                // Logo/Header
                Container(
                  width: 48.w,
                   height: 48.w,
                   decoration: BoxDecoration(
                     color: AppColors.primary,
                     borderRadius: BorderRadius.circular(12.r),
                   ),
                   child: const Icon(Icons.bolt, color: Colors.white),
                ),
                Gap(24.h),
                Text(
                  'Welcome Back',
                  style: TextStyle(
                    fontSize: 28.sp,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                Gap(8.h),
                Text(
                  'Please sign in to your account',
                  style: TextStyle(
                    fontSize: 16.sp,
                    color: AppColors.textSecondary,
                  ),
                ),
                Gap(32.h),

                // Form
                const CustomTextField(
                  hintText: 'Email Address',
                  prefixIcon: Icons.email_outlined,
                ),
                Gap(16.h),
                const CustomTextField(
                  hintText: 'Password',
                  obscureText: true,
                  prefixIcon: Icons.lock_outline,
                ),
                
                Gap(16.h),
                Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    'Forgot Password?',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                      fontSize: 14.sp,
                    ),
                  ),
                ),

                Gap(32.h),
                PrimaryButton(
                  text: 'Sign In',
                  onPressed: () {
                    // Navigate to Verification Step 1 (Demo Flow)
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const VerificationStep1Screen(),
                      ),
                    );
                  },
                ),

                Gap(24.h),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Don\'t have an account? ',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 14.sp,
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        // Navigate to Signup
                      },
                      child: Text(
                        'Sign Up',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                          fontSize: 14.sp,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
