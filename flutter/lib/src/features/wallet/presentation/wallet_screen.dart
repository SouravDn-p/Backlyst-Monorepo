import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';
import 'add_credit_screen.dart';

class WalletScreen extends StatelessWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Wallet', style: TextStyle(color: AppColors.textPrimary)),
        leading: const BackButton(color: AppColors.textPrimary),
      ),
      body: Padding(
        padding: EdgeInsets.all(24.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Balance Card
            Container(
              padding: EdgeInsets.all(24.w),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, Color(0xFF60A5FA)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20.r),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Text(
                    'Available Balance',
                    style: TextStyle(
                      color: Colors.white.withAlpha(200), // Fixed withAlpha
                      fontSize: 14.sp,
                    ),
                  ),
                  Gap(8.h),
                  Text(
                    '\$1,250.00',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 32.sp,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Gap(24.h),
                  PrimaryButton(
                    text: 'Add Funds',
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const AddCreditScreen(),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            Gap(32.h),
            Text(
              'Recent Transactions',
              style: TextStyle(
                fontSize: 18.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Gap(16.h),
            Expanded(
              child: ListView(
                children: [
                  _buildTransactionItem('Funds Added', 'Credit Card *4242', '+\$500.00', Colors.green),
                  _buildTransactionItem('Task Payment', 'SEO Optimization', '-\$120.00', Colors.red),
                  _buildTransactionItem('Task Payment', 'Logo Design', '-\$200.00', Colors.red),
                  _buildTransactionItem('Funds Added', 'PayPal', '+\$1000.00', Colors.green),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionItem(String title, String subtitle, String amount, Color color) {
    return Container(
      margin: EdgeInsets.only(bottom: 16.h),
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: AppColors.surface),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
           Column(
             crossAxisAlignment: CrossAxisAlignment.start,
             children: [
               Text(
                 title,
                 style: TextStyle(
                   fontWeight: FontWeight.bold,
                   fontSize: 16.sp,
                   color: AppColors.textPrimary,
                 ),
               ),
               Text(
                 subtitle,
                 style: TextStyle(
                   fontSize: 14.sp,
                   color: AppColors.textSecondary,
                 ),
               ),
             ],
           ),
           Text(
             amount,
             style: TextStyle(
               fontWeight: FontWeight.bold,
               fontSize: 16.sp,
               color: color,
             ),
           ),
        ],
      ),
    );
  }
}
