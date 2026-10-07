import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/custom_text_field.dart';
import '../../tasks/presentation/widgets/task_card.dart';
import 'apply_task_screen.dart';

class MarketplaceScreen extends StatelessWidget {
  const MarketplaceScreen({super.key});

  @override
  Widget build(BuildContext context) {
     final List<Map<String, dynamic>> availableTasks = [
      {
        'title': 'SEO Audit for E-commerce Site',
        'website': 'https://shopnow.com',
        'price': 150.00,
      },
      {
        'title': 'Content Writing for Tech Blog',
        'website': 'https://techdaily.io',
        'price': 80.00,
      },
      {
        'title': 'Link Building Campaign',
        'website': 'https://growthhack.net',
        'price': 300.00,
      },
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Task Marketplace', style: TextStyle(color: AppColors.textPrimary)),
        leading: const BackButton(color: AppColors.textPrimary),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list, color: AppColors.textPrimary),
            onPressed: () {},
          ),
        ],
      ),
      body: Padding(
        padding: EdgeInsets.symmetric(horizontal: 24.w),
        child: Column(
          children: [
             const CustomTextField(
              hintText: 'Search for tasks...',
              prefixIcon: Icons.search,
            ),
            Gap(24.h),
            Expanded(
              child: ListView.separated(
                itemCount: availableTasks.length,
                separatorBuilder: (context, index) => Gap(16.h),
                itemBuilder: (context, index) {
                  final task = availableTasks[index];
                  return TaskCard(
                    title: task['title'],
                    website: task['website'],
                    price: task['price'],
                    status: TaskStatus.waiting, // Reusing enum for visual consistency
                    onTap: () {
                       Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => ApplyTaskScreen(task: task),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
