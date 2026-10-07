resource "aws_lb" "this" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.subnet_ids

  enable_deletion_protection = var.enable_deletion_protection

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-alb"
  })
}

# Target Groups

# 1. Backend API Target Group
resource "aws_lb_target_group" "backend" {
  name        = "${var.project_name}-${var.environment}-be-tg"
  port        = var.backend_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    enabled             = true
    interval            = 30
    path                = var.backend_health_check_path
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    healthy_threshold   = 3
    unhealthy_threshold = 3
    matcher             = "200-399"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-be-tg"
  })
}

resource "aws_lb_target_group_attachment" "backend" {
  target_group_arn = aws_lb_target_group.backend.arn
  target_id        = var.backend_instance_id
  port             = var.backend_port
}

# 2. Next.js Frontend Target Group
resource "aws_lb_target_group" "nextjs" {
  name        = "${var.project_name}-${var.environment}-next-tg"
  port        = var.nextjs_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    enabled             = true
    interval            = 30
    path                = var.nextjs_health_check_path
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    healthy_threshold   = 3
    unhealthy_threshold = 3
    matcher             = "200-399"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-next-tg"
  })
}

resource "aws_lb_target_group_attachment" "nextjs" {
  target_group_arn = aws_lb_target_group.nextjs.arn
  target_id        = var.frontend_instance_id
  port             = var.nextjs_port
}

# 3. React Admin Dashboard Target Group
resource "aws_lb_target_group" "admin" {
  name        = "${var.project_name}-${var.environment}-admin-tg"
  port        = var.admin_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    enabled             = true
    interval            = 30
    path                = var.admin_health_check_path
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    healthy_threshold   = 3
    unhealthy_threshold = 3
    matcher             = "200-399"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-admin-tg"
  })
}

resource "aws_lb_target_group_attachment" "admin" {
  target_group_arn = aws_lb_target_group.admin.arn
  target_id        = var.frontend_instance_id
  port             = var.admin_port
}

# Listeners

# HTTP Port 80 Listener -> Redirect to HTTPS
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = var.tags
}

# HTTPS Port 443 Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "404 Not Found"
      status_code  = "404"
    }
  }

  tags = var.tags
}

# Host-Based Routing Rules (HTTPS)

# Rule 1: API Subdomain -> Backend Target Group (api.example.com)
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    host_header {
      values = ["${var.api_subdomain}.${var.domain_name}"]
    }
  }

  tags = var.tags
}

# Rule 2: Root Domain -> Next.js Target Group (example.com, www.example.com)
resource "aws_lb_listener_rule" "nextjs" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.nextjs.arn
  }

  condition {
    host_header {
      values = [
        var.domain_name,
        "www.${var.domain_name}"
      ]
    }
  }

  tags = var.tags
}

# Rule 3: Admin Subdomain -> React Admin Target Group (admin.example.com)
resource "aws_lb_listener_rule" "admin" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 30

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.admin.arn
  }

  condition {
    host_header {
      values = ["${var.admin_subdomain}.${var.domain_name}"]
    }
  }

  tags = var.tags
}
