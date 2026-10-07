import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'create_task/create_task_step_1_screen.dart';
import 'widgets/task_card.dart';
import 'task_details_screen.dart';

class TaskListScreen extends StatelessWidget {
  const TaskListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            'My Tasks',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 20.sp,
              fontWeight: FontWeight.bold,
            ),
          ),
          bottom: TabBar(
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textSecondary,
            indicatorColor: AppColors.primary,
            labelStyle: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w600),
            tabs: const [
              Tab(text: 'In Progress'),
              Tab(text: 'Waiting'),
              Tab(text: 'Completed'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildTaskList(TaskStatus.inProgress),
            _buildTaskList(TaskStatus.waiting),
            _buildTaskList(TaskStatus.completed),
          ],
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () {
            // Navigate to Create Task Screen
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const CreateTaskStep1Screen()),
            );
          },
          backgroundColor: AppColors.primary,
          child: const Icon(Icons.add, color: Colors.white),
        ),
      ),
    );
  }

  Widget _buildTaskList(TaskStatus status) {
    // Mock Data List
    final List<Map<String, dynamic>> mockTasks = [
      {
        'title': 'Homepage Redesign for Tech Startup',
        'website': 'https://techstart.io',
        'price': 450.00,
      },
      {
        'title': 'SEO Optimization for Blog',
        'website': 'https://dailyblog.com',
        'price': 120.00,
      },
      {
        'title': 'Mobile App UI/UX Review',
        'website': 'https://appreview.net',
        'price': 300.00,
      },
    ];

    return ListView.separated(
      padding: EdgeInsets.all(16.w),
      itemCount: mockTasks.length,
      separatorBuilder: (context, index) => Gap(16.h),
      itemBuilder: (context, index) {
        final task = mockTasks[index];
        return TaskCard(
          title: task['title'],
          website: task['website'],
          price: task['price'],
          status: status,
          onTap: () {
            // Navigate to Task Details
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => TaskDetailsScreen(
                  task: task,
                  status: status,
                ),
              ),
            );
          },
        );
      },
    );
  }
}
