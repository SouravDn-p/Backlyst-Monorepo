import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/custom_text_field.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';

class AddCreditScreen extends StatefulWidget {
  const AddCreditScreen({super.key});

  @override
  State<AddCreditScreen> createState() => _AddCreditScreenState();
}

class _AddCreditScreenState extends State<AddCreditScreen> {
  final TextEditingController _amountController = TextEditingController();
  int _selectedAmountIndex = -1;
  final List<String> _quickAmounts = ['50', '100', '200', '500'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Funds', style: TextStyle(color: AppColors.textPrimary)),
        leading: const BackButton(color: AppColors.textPrimary),
      ),
      body: Padding(
        padding: EdgeInsets.all(24.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter Amount',
              style: TextStyle(
                fontSize: 18.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Gap(16.h),
            CustomTextField(
              hintText: '0.00',
              prefixIcon: Icons.attach_money,
              controller: _amountController,
            ),
            Gap(24.h),
            Text(
              'Quick Select',
              style: TextStyle(
                fontSize: 14.sp,
                color: AppColors.textSecondary,
              ),
            ),
            Gap(12.h),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: List.generate(_quickAmounts.length, (index) {
                return _buildQuickAmountButton(index, _quickAmounts[index]);
              }),
            ),
            const Spacer(),
            PrimaryButton(
              text: 'Prosecute to Payment',
              onPressed: () {
                // Payment Logic
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Payment Integration Pending')),
                );
              },
            ),
            Gap(20.h),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickAmountButton(int index, String amount) {
    final isSelected = _selectedAmountIndex == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedAmountIndex = index;
          _amountController.text = amount;
        });
      },
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 12.h),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(12.r),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Text(
          '\$$amount',
          style: TextStyle(
             color: isSelected ? Colors.white : AppColors.textPrimary,
             fontWeight: FontWeight.bold,
             fontSize: 16.sp,
          ),
        ),
      ),
    );
  }
}
