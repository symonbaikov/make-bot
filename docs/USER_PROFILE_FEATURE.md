# User Profile Management Feature

## 📋 План реалізації функціоналу зміни email та пароля

> **💡 Підхід:** Додавання окремої сторінки "Налаштування" в боковій панелі з вкладками для керування профілем, зміни пароля та email.

---

## 🎨 UI/UX Рішення

### Бокова панель (Sidebar)

Додається новий пункт меню: **⚙️ Налаштування** → `/settings`

### Сторінка Settings

Три вкладки (tabs):

- 👤 **Профіль** - інформація про користувача (email, роль, дата реєстрації)
- 🔑 **Змінити пароль** - форма з трьома полями (старий/новий/підтвердження)
- ✉️ **Змінити email** - форма зміни email (з/без підтвердження)

### Блок користувача внизу sidebar

Залишається без змін: аватар + email + роль + кнопка "Війти"

---

## 1. Аналіз поточної ситуації

### Що вже є ✅

- ✅ Аватар користувача в `Layout.tsx` (рядки 86-95)
- ✅ Метод `webUserService.update()` для зміни даних користувача
- ✅ Метод `webUserService.updatePassword()` для зміни пароля
- ✅ Система скидання пароля через email з кодами підтвердження
- ✅ Email сервіс вже налаштований (`emailService`)

### Що потрібно додати 🔨

- Dropdown меню при кліку на аватар
- Модальне вікно для зміни пароля
- Модальне вікно для зміни email
- API endpoints для зміни пароля та email
- Валідація на фронтенді та бекенді

---

## 2. Resend - чи потрібен?

### ⚠️ Відповідь: НЕ ОБОВ'ЯЗКОВО, але бажано для безпеки

### Варіанти реалізації

#### **Варіант A: БЕЗ підтвердження email** (простіше)

**Характеристики:**

- Користувач змінює email напряму
- Не потребує Resend/email підтвердження
- Швидка реалізація
- ⚠️ Менш безпечно (можна встановити чужий email)

**Переваги:**

- ⚡ Швидка реалізація (1-1.5 години)
- 🔧 Не потрібна додаткова таблиця
- 🎯 Використовує вже існуючі методи
- 🔐 Перевірка пароля забезпечує базову безпеку

#### **Варіант B: З підтвердженням email** (рекомендовано)

**Характеристики:**

- При зміні email відправляється код підтвердження на НОВИЙ email
- Користувач вводить код для підтвердження
- ✅ Більш безпечно (підтверджує володіння email)
- ✅ Система email вже є, можна використовувати її
- Використовуємо існуючий `emailService`, не потрібен окремий Resend

**Для зміни пароля:**

- Вимагаємо введення старого пароля (обов'язково!)
- Відправляємо повідомлення на email про зміну пароля
- Логуємо дію в actions table

---

## 3. Детальний план реалізації

### Phase 1: Frontend - UI компоненти ⏱️ 30-40 хвилин

#### Шаг 1.1: Додати пункт "Налаштування" в боковій панелі

**Файл:** `frontend/src/components/Layout.tsx`

**Зміни в navigation array:**

```tsx
const navigation = [
  { name: 'Панель управління', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Платежі', href: '/payments', icon: CreditCard },
  { name: 'Журнал активності', href: '/actions', icon: Activity },
  { name: 'Звіти', href: '/reports', icon: FileText },
  { name: 'Чат з ІІ', href: '/ai-chat', icon: MessageSquare },
  { name: 'Створити сесію', href: '/sessions/create', icon: PlusCircle },
  { name: 'Налаштування', href: '/settings', icon: Settings }, // ⬅️ ДОДАТИ
];
```

**Імпорт іконки:**

```tsx
import { Settings } from 'lucide-react';
```

**Блок з аватаром залишається як є** (рядки 86-103), тільки кнопка "Вийти".

---

#### Шаг 1.2: Створити сторінку Settings

**Файл:** `frontend/src/pages/Settings.tsx`

**Структура сторінки:**

```tsx
import { useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Button3D } from '../components/ui/Button3D';
import { Starfall } from '../components/ui/Starfall';
import { motion } from 'framer-motion';
import { Key, Mail, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'email'>('profile');

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <Starfall />

      <div className="relative z-10 space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white">Налаштування профілю</h1>
          <p className="mt-2 text-gray-400">Керуйте своїм акаунтом та налаштуваннями безпеки</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-glass-border">
          <TabButton
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            icon={User}
          >
            Профіль
          </TabButton>
          <TabButton
            active={activeTab === 'password'}
            onClick={() => setActiveTab('password')}
            icon={Key}
          >
            Змінити пароль
          </TabButton>
          <TabButton
            active={activeTab === 'email'}
            onClick={() => setActiveTab('email')}
            icon={Mail}
          >
            Змінити email
          </TabButton>
        </div>

        {/* Content */}
        <div className="max-w-2xl">
          {activeTab === 'profile' && <ProfileSection user={user} />}
          {activeTab === 'password' && <ChangePasswordSection />}
          {activeTab === 'email' && <ChangeEmailSection />}
        </div>
      </div>
    </div>
  );
}
```

**Секції:**

- **ProfileSection** - відображення інформації про користувача (email, роль, дата реєстрації)
- **ChangePasswordSection** - форма зміни пароля
- **ChangeEmailSection** - форма зміни email

---

#### Шаг 1.3: Створити компонент форми зміни пароля

**Файл:** `frontend/src/pages/Settings.tsx` (секція ChangePasswordSection)

**Поля форми:**

- Старий пароль (type="password", required)
- Новий пароль (type="password", required)
- Підтвердження нового пароля (type="password", required)

**Валідація (Zod):**

```typescript
const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Введіть старий пароль'),
    newPassword: z
      .string()
      .min(8, 'Мінімум 8 символів')
      .regex(/[A-Z]/, 'Потрібна хоча б одна велика літера')
      .regex(/[a-z]/, 'Потрібна хоча б одна маленька літера')
      .regex(/[0-9]/, 'Потрібна хоча б одна цифра'),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Паролі не співпадають',
    path: ['confirmPassword'],
  });
```

**UI компоненти:**

- GlassCard для секції
- Button3D для кнопок
- Toast повідомлення для успіху/помилки

**Приклад компонента:**

```tsx
function ChangePasswordSection() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
  });

  const changePasswordMutation = useMutation({
    mutationFn: data => apiService.changePassword(data.oldPassword, data.newPassword),
    onSuccess: () => {
      toast.success('Пароль успішно змінено!');
      reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Помилка зміни пароля');
    },
  });

  return (
    <GlassCard className="p-6">
      <h2 className="text-xl font-bold text-white mb-6">Змінити пароль</h2>
      <form onSubmit={handleSubmit(changePasswordMutation.mutate)} className="space-y-4">
        {/* Form fields */}
      </form>
    </GlassCard>
  );
}
```

---

#### Шаг 1.4: Створити компонент форми зміни email

**Файл:** `frontend/src/pages/Settings.tsx` (секція ChangeEmailSection)

##### Варіант A (без підтвердження):

**Поля форми:**

- Новий email (type="email", required)
- Пароль для підтвердження (type="password", required)

**Валідація:**

```typescript
const changeEmailSchema = z.object({
  newEmail: z.string().email('Невірний формат email'),
  password: z.string().min(1, 'Введіть пароль для підтвердження'),
});
```

##### Варіант B (з підтвердженням):

**Крок 1: Введення нового email**

```typescript
// Поля: newEmail, password
// Кнопка: "Відправити код підтвердження"
// UI: показати повідомлення про відправку коду
```

**Крок 2: Введення коду підтвердження**

```typescript
// Поле: code (6 цифр)
// Кнопка: "Підтвердити"
// Таймер: 15 хвилин до закінчення коду
// Можливість повторної відправки коду
```

**Приклад компонента:**

```tsx
function ChangeEmailSection() {
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const { user, updateUser } = useAuth();

  const requestMutation = useMutation({
    mutationFn: data => apiService.requestEmailChange(data.newEmail, data.password),
    onSuccess: () => {
      toast.success('Код відправлено на новий email');
      setStep('confirm');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: code => apiService.confirmEmailChange(code),
    onSuccess: data => {
      updateUser(data.user, data.token);
      toast.success('Email успішно змінено!');
      setStep('input');
    },
  });

  return (
    <GlassCard className="p-6">
      {step === 'input' ? (
        <InputEmailForm onSubmit={requestMutation.mutate} />
      ) : (
        <ConfirmCodeForm onSubmit={confirmMutation.mutate} onBack={() => setStep('input')} />
      )}
    </GlassCard>
  );
}
```

---

#### Шаг 1.5: Додати роут для Settings

**Файл:** `frontend/src/App.tsx`

**Додати маршрут:**

```tsx
import { Settings } from './pages/Settings';

// В роутах:
<Route
  path="/settings"
  element={
    <ProtectedRoute>
      <Layout>
        <Settings />
      </Layout>
    </ProtectedRoute>
  }
/>;
```

---

### Phase 2: Backend - API Endpoints ⏱️ 40-50 хвилин

#### Шаг 2.1: Endpoint зміни пароля

**Route:** `POST /api/admin/profile/change-password`

**Request:**

```typescript
{
  oldPassword: string;
  newPassword: string;
}
```

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Response (Success):**

```typescript
{
  success: true,
  data: {
    message: "Пароль успішно змінено"
  }
}
```

**Response (Error):**

```typescript
{
  success: false,
  error: {
    message: "Неправильний старий пароль",
    code: "INVALID_PASSWORD"
  }
}
```

**Бізнес-логіка:**

1. Отримати user_id з JWT token
2. Перевірити старий пароль через `bcrypt.compare()`
3. Хешувати новий пароль через `bcrypt.hash()`
4. Оновити `passwordHash` в БД
5. Відправити email повідомлення про зміну пароля
6. Залогувати дію в `actions` table
7. Повернути успіх

---

#### Шаг 2.2: Endpoint зміни email (Варіант A - без підтвердження)

**Route:** `POST /api/admin/profile/change-email`

**Request:**

```typescript
{
  newEmail: string;
  password: string;
}
```

**Response (Success):**

```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      email: string; // новий email
      role: string;
      firstName: string | null;
      lastName: string | null;
    },
    token: string; // новий JWT з оновленим email
  }
}
```

**Бізнес-логіка:**

1. Отримати user_id з JWT token
2. Перевірити пароль
3. Перевірити, чи email не зайнятий іншим користувачем
4. Оновити email в БД
5. Згенерувати новий JWT token з оновленим email
6. Залогувати дію в `actions` table
7. Повернути user + новий token

---

#### Шаг 2.3: Endpoints зміни email (Варіант B - з підтвердженням)

##### Endpoint 1: Запит на зміну email

**Route:** `POST /api/admin/profile/request-email-change`

**Request:**

```typescript
{
  newEmail: string;
  password: string;
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    message: "Код підтвердження відправлено на новий email"
  }
}
```

**Бізнес-логіка:**

1. Отримати user_id з JWT token
2. Перевірити пароль
3. Перевірити, чи email не зайнятий
4. Згенерувати 6-значний код
5. Зберегти в таблиці `email_change_codes` з часом життя 15 хвилин
6. Відправити email з кодом на новий email
7. Повернути успіх

##### Endpoint 2: Підтвердження зміни email

**Route:** `POST /api/admin/profile/confirm-email-change`

**Request:**

```typescript
{
  code: string; // 6 цифр
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    user: { /* ... */ },
    token: string; // новий JWT
  }
}
```

**Бізнес-логіка:**

1. Отримати user_id з JWT token
2. Знайти валідний код в `email_change_codes`
3. Перевірити, чи код не використаний і не прострочений
4. Оновити email користувача
5. Позначити код як використаний
6. Згенерувати новий JWT
7. Залогувати дію
8. Повернути user + новий token

---

#### Шаг 2.4: Додати валідатори

**Файл:** `backend/src/validators/admin-validators.ts`

**Додати схеми:**

```typescript
// Change password validation
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Change email validation (Variant A)
export const changeEmailSchema = z.object({
  newEmail: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required for verification'),
});

export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

// Request email change validation (Variant B)
export const requestEmailChangeSchema = z.object({
  newEmail: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export type RequestEmailChangeInput = z.infer<typeof requestEmailChangeSchema>;

// Confirm email change validation (Variant B)
export const confirmEmailChangeSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only digits'),
});

export type ConfirmEmailChangeInput = z.infer<typeof confirmEmailChangeSchema>;
```

---

#### Шаг 2.5: Оновити AdminController

**Файл:** `backend/src/controllers/admin-controller.ts`

**Додати методи:**

```typescript
/**
 * POST /api/admin/profile/change-password
 * Change user password
 */
changePassword = asyncHandler(
  async (req: AuthRequest<unknown, unknown, ChangePasswordInput>, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user!.id;

    await webUserService.changePassword(userId, oldPassword, newPassword);

    sendSuccess(res, { message: 'Password changed successfully' }, 200);
  }
);

/**
 * POST /api/admin/profile/change-email
 * Change user email (without confirmation)
 */
changeEmail = asyncHandler(
  async (req: AuthRequest<unknown, unknown, ChangeEmailInput>, res: Response) => {
    const { newEmail, password } = req.body;
    const userId = req.user!.id;

    const result = await webUserService.changeEmail(userId, newEmail, password);

    sendSuccess(res, result, 200);
  }
);

// Variant B methods (if needed)
/**
 * POST /api/admin/profile/request-email-change
 * Request email change with confirmation code
 */
requestEmailChange = asyncHandler(
  async (req: AuthRequest<unknown, unknown, RequestEmailChangeInput>, res: Response) => {
    const { newEmail, password } = req.body;
    const userId = req.user!.id;

    await webUserService.requestEmailChange(userId, newEmail, password);

    sendSuccess(res, { message: 'Confirmation code sent to new email' }, 200);
  }
);

/**
 * POST /api/admin/profile/confirm-email-change
 * Confirm email change with code
 */
confirmEmailChange = asyncHandler(
  async (req: AuthRequest<unknown, unknown, ConfirmEmailChangeInput>, res: Response) => {
    const { code } = req.body;
    const userId = req.user!.id;

    const result = await webUserService.confirmEmailChange(userId, code);

    sendSuccess(res, result, 200);
  }
);
```

---

#### Шаг 2.6: Оновити routes

**Файл:** `backend/src/routes/admin-routes.ts`

**Додати маршрути:**

```typescript
// Profile management routes
router.post(
  '/profile/change-password',
  authenticate,
  validate(changePasswordSchema),
  adminController.changePassword
);

router.post(
  '/profile/change-email',
  authenticate,
  validate(changeEmailSchema),
  adminController.changeEmail
);

// Variant B routes (if needed)
router.post(
  '/profile/request-email-change',
  authenticate,
  validate(requestEmailChangeSchema),
  adminController.requestEmailChange
);

router.post(
  '/profile/confirm-email-change',
  authenticate,
  validate(confirmEmailChangeSchema),
  adminController.confirmEmailChange
);
```

---

### Phase 3: Backend - Services ⏱️ 20-30 хвилин

#### Шаг 3.1: Оновити WebUserService

**Файл:** `backend/src/services/web-user-service.ts`

**Додати методи:**

```typescript
/**
 * Change user password (with old password verification)
 */
async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
  const user = await this.findById(userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  // Verify old password
  const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid old password');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.webUser.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Send notification email
  try {
    await emailService.sendPasswordChangedNotification(user.email);
  } catch (error) {
    logger.error('Failed to send password change notification', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Log action
  await actionService.create({
    type: ActionType.OTHER,
    ref: userId,
    payload: { action: 'password_changed', email: user.email },
  });

  logger.info('User password changed', { userId, email: user.email });
}

/**
 * Change user email (without confirmation - Variant A)
 */
async changeEmail(
  userId: string,
  newEmail: string,
  password: string
): Promise<LoginResult> {
  const user = await this.findById(userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid password');
  }

  // Check if email is already taken
  const existingUser = await this.findByEmail(newEmail);
  if (existingUser && existingUser.id !== userId) {
    throw new ValidationError('Email is already taken');
  }

  // Update email
  const updatedUser = await prisma.webUser.update({
    where: { id: userId },
    data: { email: newEmail },
  });

  // Generate new JWT with updated email
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const token = jwt.sign(
    {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    },
    secret,
    { expiresIn }
  );

  // Log action
  await actionService.create({
    type: ActionType.OTHER,
    ref: userId,
    payload: {
      action: 'email_changed',
      oldEmail: user.email,
      newEmail: newEmail,
    },
  });

  logger.info('User email changed', {
    userId,
    oldEmail: user.email,
    newEmail: newEmail,
  });

  return {
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    },
    token,
  };
}
```

---

#### Шаг 3.2: Додати методи для Варіанту B (опціонально)

```typescript
/**
 * Request email change with confirmation code (Variant B)
 */
async requestEmailChange(
  userId: string,
  newEmail: string,
  password: string
): Promise<void> {
  const user = await this.findById(userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid password');
  }

  // Check if email is already taken
  const existingUser = await this.findByEmail(newEmail);
  if (existingUser && existingUser.id !== userId) {
    throw new ValidationError('Email is already taken');
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Code expires in 15 minutes
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  // Invalidate all previous unused codes for this user
  await prisma.emailChangeCode.updateMany({
    where: {
      userId: user.id,
      used: false,
    },
    data: {
      used: true,
    },
  });

  // Create new code
  await prisma.emailChangeCode.create({
    data: {
      code,
      userId: user.id,
      oldEmail: user.email,
      newEmail: newEmail,
      expiresAt,
    },
  });

  // Send email with code to NEW email address
  try {
    await emailService.sendEmailChangeConfirmation(newEmail, code);
    logger.info('Email change confirmation code sent', {
      userId,
      newEmail,
    });
  } catch (error) {
    logger.error('Failed to send email change confirmation', {
      userId,
      newEmail,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to send confirmation email');
  }
}

/**
 * Confirm email change with code (Variant B)
 */
async confirmEmailChange(userId: string, code: string): Promise<LoginResult> {
  const user = await this.findById(userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  // Find valid code
  const changeCode = await prisma.emailChangeCode.findFirst({
    where: {
      code,
      userId: user.id,
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!changeCode) {
    throw new UnauthorizedError('Invalid or expired code');
  }

  // Update email
  const updatedUser = await prisma.webUser.update({
    where: { id: userId },
    data: { email: changeCode.newEmail },
  });

  // Mark code as used
  await prisma.emailChangeCode.update({
    where: { id: changeCode.id },
    data: { used: true },
  });

  // Generate new JWT
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const token = jwt.sign(
    {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    },
    secret,
    { expiresIn }
  );

  // Log action
  await actionService.create({
    type: ActionType.OTHER,
    ref: userId,
    payload: {
      action: 'email_changed_confirmed',
      oldEmail: changeCode.oldEmail,
      newEmail: changeCode.newEmail,
    },
  });

  logger.info('User email changed and confirmed', {
    userId,
    oldEmail: changeCode.oldEmail,
    newEmail: changeCode.newEmail,
  });

  return {
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    },
    token,
  };
}
```

---

#### Шаг 3.3: Оновити EmailService

**Файл:** `backend/src/services/email-service.ts`

**Додати методи:**

```typescript
/**
 * Send notification that password was changed
 */
async sendPasswordChangedNotification(email: string): Promise<void> {
  const subject = 'Ваш пароль було змінено';
  const html = `
    <h2>Пароль змінено</h2>
    <p>Ваш пароль було успішно змінено.</p>
    <p>Якщо ви не змінювали пароль, негайно зв'яжіться з нами.</p>
    <p>Дата зміни: ${new Date().toLocaleString('uk-UA')}</p>
  `;

  await this.sendEmail(email, subject, html);
}

/**
 * Send email change confirmation code (Variant B)
 */
async sendEmailChangeConfirmation(email: string, code: string): Promise<void> {
  const subject = 'Підтвердження зміни email';
  const html = `
    <h2>Підтвердження зміни email</h2>
    <p>Ваш код підтвердження:</p>
    <h1 style="font-size: 32px; letter-spacing: 5px; color: #4F46E5;">${code}</h1>
    <p>Код дійсний протягом 15 хвилин.</p>
    <p>Якщо ви не запитували зміну email, проігноруйте цей лист.</p>
  `;

  await this.sendEmail(email, subject, html);
}
```

---

### Phase 4: Database ⏱️ 10 хвилин (тільки для Варіанту B)

#### Шаг 4.1: Оновити Prisma schema

**Файл:** `backend/prisma/schema.prisma`

**Додати модель:**

```prisma
model EmailChangeCode {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  oldEmail  String   @map("old_email")
  newEmail  String   @map("new_email")
  code      String
  used      Boolean  @default(false)
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user WebUser @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, used, expiresAt])
  @@index([code])
  @@map("email_change_codes")
}
```

**Оновити модель WebUser:**

```prisma
model WebUser {
  id                 String              @id @default(uuid())
  email              String              @unique
  passwordHash       String              @map("password_hash")
  role               Role                @default(MANAGER)
  firstName          String?             @map("first_name")
  lastName           String?             @map("last_name")
  createdAt          DateTime            @default(now()) @map("created_at")
  updatedAt          DateTime            @updatedAt @map("updated_at")

  passwordResetCodes PasswordResetCode[]
  emailChangeCodes   EmailChangeCode[]   // Додати цей рядок

  @@map("web_users")
}
```

---

#### Шаг 4.2: Створити міграцію

```bash
cd backend
npx prisma migrate dev --name add_email_change_codes
```

---

### Phase 5: Integration & Testing ⏱️ 20-30 хвилин

#### Шаг 5.1: Оновити AuthContext

**Файл:** `frontend/src/contexts/AuthContext.tsx`

**Додати методи:**

```typescript
interface AuthContextType {
  user: AuthUser | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithResetCode: (email: string, code: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: AuthUser, token?: string) => void; // Додати
  isAuthenticated: boolean;
  isLoading: boolean;
}

// В AuthProvider додати метод:
const updateUser = (user: AuthUser, token?: string) => {
  setUser(user);
  localStorage.setItem('auth_user', JSON.stringify(user));

  if (token) {
    localStorage.setItem('auth_token', token);
  }

  // Update in Sentry
  setSentryUser({
    id: user.id,
    email: user.email,
    username: user.email,
  });
};
```

---

#### Шаг 5.2: Оновити API Service

**Файл:** `frontend/src/services/api.ts`

**Додати методи:**

```typescript
// Change password
async changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const response = await this.client.post('/admin/profile/change-password', {
    oldPassword,
    newPassword,
  });
  return response.data.data;
}

// Change email (Variant A)
async changeEmail(newEmail: string, password: string): Promise<LoginResponse> {
  const response = await this.client.post('/admin/profile/change-email', {
    newEmail,
    password,
  });
  return response.data.data;
}

// Variant B methods
async requestEmailChange(newEmail: string, password: string): Promise<void> {
  const response = await this.client.post('/admin/profile/request-email-change', {
    newEmail,
    password,
  });
  return response.data.data;
}

async confirmEmailChange(code: string): Promise<LoginResponse> {
  const response = await this.client.post('/admin/profile/confirm-email-change', {
    code,
  });
  return response.data.data;
}
```

---

#### Шаг 5.3: Тестування

**Тест-кейси:**

1. **Зміна пароля:**
   - ✅ Успішна зміна з правильним старим паролем
   - ❌ Помилка з неправильним старим паролем
   - ❌ Помилка якщо новий пароль не відповідає вимогам
   - ❌ Помилка якщо паролі не співпадають
   - ✅ Email повідомлення відправлено
   - ✅ Дія залогована в actions table

2. **Зміна email (Варіант A):**
   - ✅ Успішна зміна з правильним паролем
   - ❌ Помилка з неправильним паролем
   - ❌ Помилка якщо email вже зайнятий
   - ❌ Помилка якщо невірний формат email
   - ✅ Новий JWT token згенеровано
   - ✅ localStorage оновлено
   - ✅ Дія залогована в actions table

3. **Зміна email (Варіант B):**
   - ✅ Код відправлено на новий email
   - ❌ Помилка з невірним/прострочeним кодом
   - ✅ Email змінено після підтвердження коду
   - ✅ Новий JWT token згенеровано

---

## 4. Рекомендований підхід

### 🎯 Почати з Варіанту A (БЕЗ підтвердження email)

**Чому:**

- ⚡ Швидка реалізація (1-1.5 години)
- 🔧 Не потрібна додаткова таблиця в БД
- 🎯 Використовує вже існуючі методи
- 🔐 Перевірка пароля забезпечує базову безпеку
- ✅ Можна розгорнути одразу

**Потім можна додати Варіант B:**

- Якщо знадобиться більш строга безпека
- Додається як enhancement
- Не ламає існуючий функціонал
- Додається нова таблиця та endpoints

---

## 5. Резюме по Resend

### ❌ Resend НЕ ПОТРІБЕН!

**Чому:**

- ✅ У вас вже є налаштований `emailService`
- ✅ Вже працює відправка кодів скидання пароля
- ✅ Можна використовувати ту ж систему для кодів зміни email
- ℹ️ Resend - це просто альтернатива вашому поточному email провайдеру

**Що використовується зараз:**
Судячи з коду, у вас вже налаштований email сервіс (можливо Nodemailer або інший).
Просто додамо нові шаблони листів в існуючий сервіс.

---

## 6. Пріоритети

### 🔴 HIGH: Зміна пароля

- З перевіркою старого пароля
- Email повідомлення
- Логування дії

### 🟡 MEDIUM: Зміна email (Варіант A)

- Без підтвердження
- З перевіркою пароля
- Оновлення JWT

### 🟢 LOW: Підтвердження email (Варіант B)

- Enhancement
- Додаткова безпека
- Опціонально

---

## 7. Часова оцінка

| Phase                         | Час               | Складність     | Компоненти               |
| ----------------------------- | ----------------- | -------------- | ------------------------ |
| Phase 1: Frontend UI          | 40-50 хв          | 🟡 Medium      | Settings page + 3 секції |
| Phase 2: Backend API          | 40-50 хв          | 🟠 Medium-High | Endpoints + валідація    |
| Phase 3: Backend Services     | 20-30 хв          | 🟡 Medium      | WebUserService методи    |
| Phase 4: Database (Варіант B) | 10 хв             | 🟢 Easy        | Prisma міграція          |
| Phase 5: Integration          | 20-30 хв          | 🟡 Medium      | Роути + тестування       |
| **ВСЬОГО (Варіант A)**        | **~2-2.5 години** | -              | Без підтвердження email  |
| **ВСЬОГО (Варіант B)**        | **~2.5-3 години** | -              | З підтвердженням email   |

### Деталізація Phase 1 (Frontend):

- Додати іконку Settings до Layout (**5 хв**)
- Створити Settings page з табами (**15 хв**)
- Секція ProfileSection (**10 хв**)
- Секція ChangePasswordSection (**15 хв**)
- Секція ChangeEmailSection (**10-15 хв**)
- Додати роут в App.tsx (**2 хв**)

---

## 8. Структура файлів

```
make-bot/
├── frontend/
│   └── src/
│       ├── components/
│       │   └── Layout.tsx (оновити - додати пункт меню)
│       ├── pages/
│       │   └── Settings.tsx (новий) ⬅️ ГОЛОВНИЙ ФАЙЛ
│       │       ├── ProfileSection (компонент)
│       │       ├── ChangePasswordSection (компонент)
│       │       └── ChangeEmailSection (компонент)
│       ├── contexts/
│       │   └── AuthContext.tsx (оновити - додати updateUser)
│       ├── services/
│       │   └── api.ts (оновити - додати методи)
│       └── App.tsx (оновити - додати роут /settings)
└── backend/
    ├── src/
    │   ├── controllers/
    │   │   └── admin-controller.ts (оновити - додати методи)
    │   ├── services/
    │   │   ├── web-user-service.ts (оновити - додати методи)
    │   │   └── email-service.ts (оновити - додати шаблони)
    │   ├── routes/
    │   │   └── admin-routes.ts (оновити - додати роути)
    │   └── validators/
    │       └── admin-validators.ts (оновити - додати схеми)
    └── prisma/
        └── schema.prisma (оновити для Варіанту B - додати таблицю)
```

### Переваги нового підходу:

✅ **Простіше в навігації** - окрема сторінка замість dropdown меню  
✅ **Більше простору** - можна розмістити додаткові налаштування  
✅ **Краще UX** - всі налаштування в одному місці  
✅ **Легше розширювати** - можна додавати нові секції (аватар, мова, тема і т.д.)  
✅ **Менше кліків** - прямий доступ з сайдбару

---

## 9. Безпека

### 🔐 Чеклист безпеки

- [x] Старий пароль завжди перевіряється перед зміною
- [x] Пароль завжди перевіряється перед зміною email
- [x] Новий пароль відповідає вимогам складності
- [x] Email валідується на формат та унікальність
- [x] JWT токени оновлюються після зміни email
- [x] Всі дії логуються в actions table
- [x] Email повідомлення відправляються про зміни
- [x] Коди підтвердження мають термін дії (15 хвилин)
- [x] Старі коди інвалідуються при створенні нових

---

## 10. Готові до старту? 🚀

Рекомендую почати з **Варіанту A** - це дасть робочий функціонал за ~1.5-2 години.

**План дій:**

1. Створити UI компоненти (UserMenu, модальні вікна)
2. Додати backend endpoints та services
3. Інтегрувати з AuthContext
4. Протестувати

Після успішного впровадження Варіанту A, можна розглянути додавання Варіанту B для додаткової безпеки.

---

## 11. Візуалізація структури

### Бокова панель (Layout.tsx)

```
┌─────────────────────────┐
│     Make Bot            │
├─────────────────────────┤
│ 🏠 Панель управління    │
│ 💳 Платежі              │
│ 📊 Журнал активності    │
│ 📄 Звіти                │
│ 💬 Чат з ІІ             │
│ ➕ Створити сесію        │
│ ⚙️ Налаштування   ⬅️ NEW│
├─────────────────────────┤
│  👤 admin@example.com   │
│     ADMIN               │
│  🚪 Вийти               │
└─────────────────────────┘
```

### Сторінка Settings (/settings)

```
┌──────────────────────────────────────────────────────┐
│  Налаштування профілю                                │
│  Керуйте своїм акаунтом та налаштуваннями безпеки   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  [Профіль] [Змінити пароль] [Змінити email]         │
│  ━━━━━━                                              │
│                                                       │
│  ┌────────────────────────────────────────────┐     │
│  │  👤 Інформація про профіль                 │     │
│  │                                             │     │
│  │  Email: admin@example.com                  │     │
│  │  Роль: ADMIN                               │     │
│  │  Дата реєстрації: 01.01.2024              │     │
│  │                                             │     │
│  └────────────────────────────────────────────┘     │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Вкладка "Змінити пароль"

```
┌──────────────────────────────────────────────────────┐
│  [Профіль] [Змінити пароль] [Змінити email]         │
│            ━━━━━━━━━━━━━━━                          │
│                                                       │
│  ┌────────────────────────────────────────────┐     │
│  │  🔑 Змінити пароль                         │     │
│  │                                             │     │
│  │  Старий пароль                             │     │
│  │  [••••••••••••]                            │     │
│  │                                             │     │
│  │  Новий пароль                              │     │
│  │  [••••••••••••]                            │     │
│  │                                             │     │
│  │  Підтвердження нового пароля               │     │
│  │  [••••••••••••]                            │     │
│  │                                             │     │
│  │              [Змінити пароль]              │     │
│  │                                             │     │
│  └────────────────────────────────────────────┘     │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Вкладка "Змінити email"

```
┌──────────────────────────────────────────────────────┐
│  [Профіль] [Змінити пароль] [Змінити email]         │
│                              ━━━━━━━━━━━━           │
│                                                       │
│  ┌────────────────────────────────────────────┐     │
│  │  ✉️ Змінити email                          │     │
│  │                                             │     │
│  │  Поточний email: admin@example.com         │     │
│  │                                             │     │
│  │  Новий email                               │     │
│  │  [_____________________________]           │     │
│  │                                             │     │
│  │  Пароль для підтвердження                  │     │
│  │  [••••••••••••]                            │     │
│  │                                             │     │
│  │              [Змінити email]               │     │
│  │                                             │     │
│  └────────────────────────────────────────────┘     │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 12. Чеклист реалізації

### Frontend ✅

- [ ] Додати іконку `Settings` в імпорт `Layout.tsx`
- [ ] Додати пункт "Налаштування" в `navigation` array
- [ ] Створити файл `frontend/src/pages/Settings.tsx`
- [ ] Реалізувати `ProfileSection` компонент
- [ ] Реалізувати `ChangePasswordSection` компонент
- [ ] Реалізувати `ChangeEmailSection` компонент
- [ ] Додати Zod схеми валідації
- [ ] Додати роут `/settings` в `App.tsx`
- [ ] Протестувати UI на різних екранах

### Backend ✅

- [ ] Додати валідатори в `admin-validators.ts`
  - [ ] `changePasswordSchema`
  - [ ] `changeEmailSchema`
  - [ ] `requestEmailChangeSchema` (Варіант B)
  - [ ] `confirmEmailChangeSchema` (Варіант B)
- [ ] Додати методи в `AdminController`
  - [ ] `changePassword()`
  - [ ] `changeEmail()`
  - [ ] `requestEmailChange()` (Варіант B)
  - [ ] `confirmEmailChange()` (Варіант B)
- [ ] Додати методи в `WebUserService`
  - [ ] `changePassword(userId, oldPassword, newPassword)`
  - [ ] `changeEmail(userId, newEmail, password)`
  - [ ] `requestEmailChange()` (Варіант B)
  - [ ] `confirmEmailChange()` (Варіант B)
- [ ] Додати методи в `EmailService`
  - [ ] `sendPasswordChangedNotification(email)`
  - [ ] `sendEmailChangeConfirmation(email, code)` (Варіант B)
- [ ] Додати роути в `admin-routes.ts`
  - [ ] `POST /api/admin/profile/change-password`
  - [ ] `POST /api/admin/profile/change-email`
  - [ ] `POST /api/admin/profile/request-email-change` (Варіант B)
  - [ ] `POST /api/admin/profile/confirm-email-change` (Варіант B)

### Database (тільки Варіант B) ✅

- [ ] Оновити `prisma/schema.prisma`
  - [ ] Додати модель `EmailChangeCode`
  - [ ] Додати relation в `WebUser`
- [ ] Створити міграцію
- [ ] Застосувати міграцію в dev
- [ ] Перевірити таблицю в БД

### Integration ✅

- [ ] Оновити `AuthContext` - додати `updateUser()`
- [ ] Оновити `api.ts` - додати методи
- [ ] Протестувати зміну пароля
- [ ] Протестувати зміну email
- [ ] Перевірити логування в `actions` table
- [ ] Перевірити відправку email повідомлень

---

## 13. Готові до старту? 🚀

**Рекомендований план дій:**

1. ✅ **Крок 1:** Почати з Frontend - створити сторінку Settings з трьома вкладками
2. ✅ **Крок 2:** Додати Backend endpoints та services
3. ✅ **Крок 3:** Інтегрувати з AuthContext та API service
4. ✅ **Крок 4:** Протестувати повний flow
5. ⭐ **Крок 5:** (Опціонально) Додати Варіант B з підтвердженням email

**Очікуваний результат:**

- Нова сторінка "Налаштування" в sidebar
- Можливість зміни пароля з перевіркою старого пароля
- Можливість зміни email з перевіркою пароля
- Email повідомлення про зміни
- Логування всіх дій в actions table

**Час реалізації:** ~2-2.5 години (Варіант A) або ~2.5-3 години (Варіант B)
