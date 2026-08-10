# PCStore API Documentation

Base URL: `http://localhost:3000`

---

## Authentication Header

For all protected routes, include the JWT token in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

---

## 1. System Endpoints

### 1.1 Health Check
Check if the API server is running.

- **URL**: `/`
- **Method**: `GET`
- **Access**: Public

#### Response (`200 OK`):
```json
{
  "message": "PCStore API is running"
}
```

---

## 2. Auth Endpoints (`/api/auth`)

### 2.1 Register New Account
Create a new user account. Upon successful registration, a user cart is automatically created.

- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Access**: Public
- **Headers**: `Content-Type: application/json`

#### Request Body:
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "phone": "0987654321"
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `username` | string | Yes | Unique username |
| `email` | string | Yes | Unique valid email address |
| `password` | string | Yes | Minimum 6 characters |
| `fullName` | string | Yes | Full name of user |
| `phone` | string | No | Contact phone number |

#### Response (`201 Created`):
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "username": "johndoe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "phone": "0987654321",
    "avatar": null,
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "createdAt": "2026-08-08T14:30:00.000Z",
    "updatedAt": "2026-08-08T14:30:00.000Z"
  }
}
```

#### Error Responses:
- **`400 Bad Request`**: Missing required fields, invalid email format, or password < 6 characters.
  ```json
  { "message": "Missing required fields: username, email, password, and fullName are required" }
  ```
- **`409 Conflict`**: Email or username already in use.
  ```json
  { "message": "Email is already registered" }
  ```

---

### 2.2 User Login
Authenticate with email or username and password to receive a JWT token.

- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Access**: Public
- **Headers**: `Content-Type: application/json`

#### Request Body (by Email):
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Request Body (by Username):
```json
{
  "username": "johndoe",
  "password": "password123"
}
```

#### Response (`200 OK`):
```json
{
  "message": "Login successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "username": "johndoe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "phone": "0987654321",
    "avatar": null,
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "createdAt": "2026-08-08T14:30:00.000Z",
    "updatedAt": "2026-08-08T14:30:00.000Z"
  }
}
```

#### Error Responses:
- **`400 Bad Request`**: Missing identifier or password.
  ```json
  { "message": "Email/Username and password are required" }
  ```
- **`401 Unauthorized`**: Wrong credentials.
  ```json
  { "message": "Invalid email/username or password" }
  ```
- **`403 Forbidden`**: Account is banned or inactive.
  ```json
  { "message": "Your account has been banned. Please contact support." }
  ```

---

### 2.3 Get Profile
Fetch current logged-in user profile.

- **URL**: `/api/auth/me`
- **Method**: `GET`
- **Access**: Protected (`Bearer <token>`)

#### Response (`200 OK`):
```json
{
  "user": {
    "id": "1",
    "username": "johndoe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "phone": "0987654321",
    "avatar": null,
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "createdAt": "2026-08-08T14:30:00.000Z",
    "updatedAt": "2026-08-08T14:30:00.000Z"
  }
}
```

#### Error Responses:
- **`401 Unauthorized`**: Missing or invalid/expired token.
  ```json
  { "message": "Unauthorized: Invalid or expired token" }
  ```

---

### 2.4 Update Profile
Update profile details for the authenticated user.

- **URL**: `/api/auth/profile`
- **Method**: `PUT`
- **Access**: Protected (`Bearer <token>`)
- **Headers**: `Content-Type: application/json`

#### Request Body:
```json
{
  "fullName": "John Updated",
  "phone": "0912345678",
  "avatar": "https://example.com/avatar.jpg"
}
```

#### Response (`200 OK`):
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "1",
    "username": "johndoe",
    "email": "john@example.com",
    "fullName": "John Updated",
    "phone": "0912345678",
    "avatar": "https://example.com/avatar.jpg",
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "createdAt": "2026-08-08T14:30:00.000Z",
    "updatedAt": "2026-08-08T14:35:00.000Z"
  }
}
```

---

### 2.5 Change Password
Change current user password.

- **URL**: `/api/auth/change-password`
- **Method**: `PUT`
- **Access**: Protected (`Bearer <token>`)
- **Headers**: `Content-Type: application/json`

#### Request Body:
```json
{
  "currentPassword": "password123",
  "newPassword": "newpassword456"
}
```

#### Response (`200 OK`):
```json
{
  "message": "Password changed successfully"
}
```

#### Error Responses:
- **`400 Bad Request`**: Incorrect current password or new password < 6 characters.
  ```json
  { "message": "Current password is incorrect" }
  ```

---

## 3. Product Endpoints (`/api/products`)

### 3.1 Get Product List (Paginated & Filtered)
Retrieve a paginated list of products with support for searching, category/brand filtering, price range, and sorting.

- **URL**: `/api/products`
- **Method**: `GET`
- **Access**: Public

#### Query Parameters:

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Products per page (max 100) |
| `search` / `q` | string | `undefined` | Search term in `name`, `sku`, `shortDescription` |
| `categoryId` | string | `undefined` | Filter by category ID |
| `brandId` | string | `undefined` | Filter by brand ID |
| `minPrice` | number | `undefined` | Filter by minimum price |
| `maxPrice` | number | `undefined` | Filter by maximum price |
| `status` | string | `"ACTIVE"` | Filter by status (`ACTIVE`, `INACTIVE`, `OUT_OF_STOCK`) |
| `isFeatured` | boolean | `undefined` | Filter featured products (`true`/`false`) |
| `sortBy` | string | `"createdAt"` | Field to sort by (`createdAt`, `price`, `viewCount`, `name`) |
| `sortOrder` | string | `"desc"` | Sort direction (`asc` or `desc`) |

#### Example Request:
`GET /api/products?page=1&limit=10&search=asus&minPrice=10000000&maxPrice=30000000&sortBy=price&sortOrder=asc`

#### Response (`200 OK`):
```json
{
  "products": [
    {
      "id": "1",
      "name": "Laptop ASUS ROG Strix G16",
      "slug": "laptop-asus-rog-strix-g16",
      "sku": "ASUS-ROG-G16-01",
      "shortDescription": "High performance gaming laptop",
      "description": "Intel Core i7 13th Gen, RTX 4060, 16GB RAM, 512GB SSD",
      "price": 25990000,
      "originalPrice": 28990000,
      "stock": 15,
      "image": "https://example.com/images/asus-g16.jpg",
      "images": ["https://example.com/images/asus-g16-1.jpg"],
      "specifications": {
        "cpu": "Intel Core i7-13650HX",
        "gpu": "NVIDIA RTX 4060 8GB",
        "ram": "16GB DDR5",
        "storage": "512GB NVMe SSD"
      },
      "warranty": 24,
      "status": "ACTIVE",
      "isFeatured": true,
      "viewCount": 42,
      "categoryId": "1",
      "brandId": "1",
      "category": {
        "id": "1",
        "name": "Laptop Gaming",
        "slug": "laptop-gaming",
        "description": "Powerful gaming laptops",
        "parentId": null,
        "createdAt": "2026-08-08T14:30:00.000Z",
        "updatedAt": "2026-08-08T14:30:00.000Z"
      },
      "brand": {
        "id": "1",
        "name": "ASUS",
        "slug": "asus",
        "description": "ASUS ROG & TUF Series",
        "logo": "https://example.com/logos/asus.png",
        "createdAt": "2026-08-08T14:30:00.000Z",
        "updatedAt": "2026-08-08T14:30:00.000Z"
      },
      "createdAt": "2026-08-08T14:30:00.000Z",
      "updatedAt": "2026-08-08T14:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 3.2 Get Featured Products
Quickly fetch active featured products.

- **URL**: `/api/products/featured`
- **Method**: `GET`
- **Access**: Public

#### Query Parameters:
- `limit` (number, default `10`): Number of featured items to return.

#### Response (`200 OK`):
```json
{
  "products": [ /* Array of active featured products */ ]
}
```

---

### 3.3 Get Product Detail (by ID or Slug)
Fetch detailed information of a single product using either numerical `id` or string `slug`. Increases product `viewCount` by 1.

- **URL**: `/api/products/:idOrSlug`
- **Method**: `GET`
- **Access**: Public

#### Example Request:
`GET /api/products/1` OR `GET /api/products/laptop-asus-rog-strix-g16`

#### Response (`200 OK`):
```json
{
  "product": {
    "id": "1",
    "name": "Laptop ASUS ROG Strix G16",
    "slug": "laptop-asus-rog-strix-g16",
    "sku": "ASUS-ROG-G16-01",
    "shortDescription": "High performance gaming laptop",
    "description": "Intel Core i7 13th Gen, RTX 4060...",
    "price": 25990000,
    "originalPrice": 28990000,
    "stock": 15,
    "image": "https://example.com/images/asus-g16.jpg",
    "images": ["https://example.com/images/asus-g16-1.jpg"],
    "specifications": { "cpu": "Intel Core i7" },
    "warranty": 24,
    "status": "ACTIVE",
    "isFeatured": true,
    "viewCount": 43,
    "categoryId": "1",
    "brandId": "1",
    "category": { "id": "1", "name": "Laptop Gaming" },
    "brand": { "id": "1", "name": "ASUS" },
    "createdAt": "2026-08-08T14:30:00.000Z",
    "updatedAt": "2026-08-08T14:30:00.000Z"
  }
}
```

#### Error Response:
- **`404 Not Found`**: Product does not exist.
  ```json
  { "message": "Product not found" }
  ```

---

### 3.4 Create Product (Admin Only)
Create a new product item in store catalog.

- **URL**: `/api/products`
- **Method**: `POST`
- **Access**: Protected (`ADMIN` role required)
- **Headers**:
  - `Authorization: Bearer <admin_token>`
  - `Content-Type: application/json`

#### Request Body:
```json
{
  "name": "Laptop MSI Katana 15",
  "slug": "laptop-msi-katana-15", // optional, auto-generated from name if omitted
  "sku": "MSI-KATANA-15-01",
  "shortDescription": "Budget gaming laptop with i5 13th Gen",
  "description": "Full HD 144Hz display, RTX 3050",
  "price": 18990000,
  "originalPrice": 20990000,
  "stock": 20,
  "image": "https://example.com/msi.jpg",
  "images": ["https://example.com/msi-1.jpg"],
  "specifications": { "cpu": "i5-13420H", "gpu": "RTX 3050" },
  "warranty": 12,
  "status": "ACTIVE",
  "isFeatured": false,
  "categoryId": "1",
  "brandId": "2"
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | string | Yes | Product name |
| `sku` | string | Yes | Unique stock keeping unit |
| `price` | number | Yes | Current selling price |
| `categoryId` | string | Yes | ID of category |
| `brandId` | string | Yes | ID of brand |
| `slug` | string | No | Custom slug (auto-generated from `name` if empty) |
| `originalPrice` | number | No | Original list price |
| `stock` | number | No | Available quantity (default `0`) |
| `image` | string | No | Primary image URL |
| `images` | array/json | No | Additional images array |
| `specifications` | object/json | No | Tech specs key-value object |
| `warranty` | number | No | Warranty duration in months |
| `status` | string | No | `ACTIVE`, `INACTIVE`, or `OUT_OF_STOCK` (default `ACTIVE`) |
| `isFeatured` | boolean | No | Mark as featured product (default `false`) |

#### Response (`201 Created`):
```json
{
  "message": "Product created successfully",
  "product": {
    "id": "2",
    "name": "Laptop MSI Katana 15",
    "slug": "laptop-msi-katana-15",
    "sku": "MSI-KATANA-15-01",
    "price": 18990000,
    "stock": 20,
    "categoryId": "1",
    "brandId": "2",
    "createdAt": "2026-08-08T14:35:00.000Z",
    "updatedAt": "2026-08-08T14:35:00.000Z"
  }
}
```

#### Error Responses:
- **`400 Bad Request`**: Missing required fields or category/brand not found.
- **`401 Unauthorized`**: Missing Bearer token.
- **`403 Forbidden`**: User is not an `ADMIN`.
- **`409 Conflict`**: SKU or slug already exists.

---

### 3.5 Update Product (Admin Only)
Update attributes of an existing product.

- **URL**: `/api/products/:id`
- **Method**: `PUT`
- **Access**: Protected (`ADMIN` role required)
- **Headers**:
  - `Authorization: Bearer <admin_token>`
  - `Content-Type: application/json`

#### Request Body (partial updates allowed):
```json
{
  "price": 17990000,
  "stock": 25,
  "isFeatured": true
}
```

#### Response (`200 OK`):
```json
{
  "message": "Product updated successfully",
  "product": {
    "id": "2",
    "name": "Laptop MSI Katana 15",
    "price": 17990000,
    "stock": 25,
    "isFeatured": true,
    "updatedAt": "2026-08-08T14:40:00.000Z"
  }
}
```

---

### 3.6 Delete Product (Admin Only)
Delete a product from database. If the product is referenced in active orders or carts, its status will be set to `INACTIVE` to prevent database integrity errors.

- **URL**: `/api/products/:id`
- **Method**: `DELETE`
- **Access**: Protected (`ADMIN` role required)
- **Headers**: `Authorization: Bearer <admin_token>`

#### Response (`200 OK`):
```json
{
  "message": "Product deleted successfully"
}
```

#### Response (if referenced in existing records):
```json
{
  "message": "Product is referenced in existing records and has been set to INACTIVE instead of deletion"
}
```

---

## 4. Category Endpoints (`/api/categories`)

### 4.1 Get Categories List
Retrieve category items as a hierarchical tree or flat list.

- **URL**: `/api/categories`
- **Method**: `GET`
- **Access**: Public

#### Query Parameters:
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `tree` | boolean | `false` | Set to `true` to return nested tree structure |
| `parentId` | string | `undefined` | Filter by `parentId` (`null` for root categories, or integer ID) |

#### Example Request (Tree View):
`GET /api/categories?tree=true`

#### Response (`200 OK`):
```json
{
  "categories": [
    {
      "id": "1",
      "name": "Linh kiện máy tính",
      "slug": "linh-kien-may-tinh",
      "description": "Các loại linh kiện máy tính, linh kiện PC chính hãng",
      "parentId": null,
      "children": [
        {
          "id": "2",
          "name": "CPU - Bộ vi xử lý",
          "slug": "cpu-bo-vi-xu-ly",
          "description": "Bộ vi xử lý Intel, AMD chính hãng",
          "parentId": "1",
          "createdAt": "2026-08-08T14:45:00.000Z",
          "updatedAt": "2026-08-08T14:45:00.000Z"
        },
        {
          "id": "3",
          "name": "VGA - Card đồ họa",
          "slug": "vga-card-do-hoa",
          "description": "Card màn hình NVIDIA RTX, AMD Radeon",
          "parentId": "1",
          "createdAt": "2026-08-08T14:45:00.000Z",
          "updatedAt": "2026-08-08T14:45:00.000Z"
        }
      ],
      "createdAt": "2026-08-08T14:45:00.000Z",
      "updatedAt": "2026-08-08T14:45:00.000Z"
    },
    {
      "id": "11",
      "name": "PC",
      "slug": "pc",
      "description": "Máy tính để bàn hoàn chỉnh",
      "parentId": null,
      "children": [
        {
          "id": "12",
          "name": "PC Gaming",
          "slug": "pc-gaming",
          "description": "Máy tính chơi game cấu hình cao",
          "parentId": "11"
        }
      ]
    }
  ]
}
```

---

### 4.2 Get Category Detail (by ID or Slug)
Retrieve category information along with parent category and subcategories.

- **URL**: `/api/categories/:idOrSlug`
- **Method**: `GET`
- **Access**: Public

#### Example Request:
`GET /api/categories/linh-kien-may-tinh` OR `GET /api/categories/1`

#### Response (`200 OK`):
```json
{
  "category": {
    "id": "1",
    "name": "Linh kiện máy tính",
    "slug": "linh-kien-may-tinh",
    "description": "Các loại linh kiện máy tính, linh kiện PC chính hãng",
    "parentId": null,
    "children": [
      {
        "id": "2",
        "name": "CPU - Bộ vi xử lý",
        "slug": "cpu-bo-vi-xu-ly",
        "description": "Bộ vi xử lý Intel, AMD chính hãng",
        "parentId": "1"
      }
    ],
    "createdAt": "2026-08-08T14:45:00.000Z",
    "updatedAt": "2026-08-08T14:45:00.000Z"
  }
}
```

---

### 4.3 Get Brands by Category
Retrieve list of brands that belong to a specific category (by `id` or `slug`). Automatically aggregates brands from subcategories if a parent category is selected.

- **URL**: `/api/categories/:idOrSlug/brands`
- **Method**: `GET`
- **Access**: Public

#### Example Request:
`GET /api/categories/linh-kien-may-tinh/brands` OR `GET /api/categories/cpu-bo-vi-xu-ly/brands`

#### Response (`200 OK`):
```json
{
  "category": {
    "id": "7",
    "name": "CPU - Bộ vi xử lý",
    "slug": "cpu-bo-vi-xu-ly"
  },
  "brands": [
    {
      "id": "1",
      "name": "Intel",
      "slug": "intel",
      "description": "Intel",
      "logo": null,
      "createdAt": "2026-06-06T21:45:48.336Z",
      "updatedAt": "2026-06-06T21:45:48.336Z"
    },
    {
      "id": "2",
      "name": "AMD",
      "slug": "amd",
      "description": "AMD",
      "logo": null,
      "createdAt": "2026-06-06T21:45:48.336Z",
      "updatedAt": "2026-06-06T21:45:48.336Z"
    }
  ]
}
```

---

### 4.4 Create Category (Admin Only)
Create a new category.

- **URL**: `/api/categories`
- **Method**: `POST`
- **Access**: Protected (`ADMIN` role required)
- **Headers**:
  - `Authorization: Bearer <admin_token>`
  - `Content-Type: application/json`

#### Request Body:
```json
{
  "name": "Màn hình máy tính",
  "slug": "man-hinh-may-tinh", // optional
  "description": "Màn hình Gaming 144Hz, 4K",
  "parentId": null // optional, set to parent category ID for subcategory
}
```

#### Response (`201 Created`):
```json
{
  "message": "Category created successfully",
  "category": {
    "id": "16",
    "name": "Màn hình máy tính",
    "slug": "man-hinh-may-tinh",
    "description": "Màn hình Gaming 144Hz, 4K",
    "parentId": null,
    "createdAt": "2026-08-08T14:50:00.000Z",
    "updatedAt": "2026-08-08T14:50:00.000Z"
  }
}
```

---

### 4.4 Update Category (Admin Only)
Update details or parent hierarchy of a category.

- **URL**: `/api/categories/:id`
- **Method**: `PUT`
- **Access**: Protected (`ADMIN` role required)
- **Headers**:
  - `Authorization: Bearer <admin_token>`
  - `Content-Type: application/json`

#### Request Body:
```json
{
  "name": "Màn hình PC & Gaming",
  "description": "Màn hình máy tính cao cấp"
}
```

#### Response (`200 OK`):
```json
{
  "message": "Category updated successfully",
  "category": {
    "id": "16",
    "name": "Màn hình PC & Gaming",
    "slug": "man-hinh-pc-gaming",
    "description": "Màn hình máy tính cao cấp",
    "parentId": null,
    "updatedAt": "2026-08-08T14:52:00.000Z"
  }
}
```

---

### 4.5 Delete Category (Admin Only)
Delete a category. Subcategories will be unlinked (set `parentId` to null).

- **URL**: `/api/categories/:id`
- **Method**: `DELETE`
- **Access**: Protected (`ADMIN` role required)
- **Headers**: `Authorization: Bearer <admin_token>`

#### Response (`200 OK`):
```json
{
  "message": "Category deleted successfully"
}
```

#### Error Response (if category contains products):
- **`400 Bad Request`**:
  ```json
  { "message": "Cannot delete category because it contains products. Reassign or delete products first." }
  ```

---

## 5. Order Endpoints (`/api/orders`)

### 5.1 Create Order
Create a new purchase order. Supports both logged-in users and guests. If `items` is not provided in request body, items will be automatically pulled from the authenticated user's cart.

- **URL**: `/api/orders`
- **Method**: `POST`
- **Access**: Public / Optional Auth (`Bearer <token>`)
- **Headers**: `Content-Type: application/json`

#### Request Body (Direct Items):
```json
{
  "customerName": "John Doe",
  "customerPhone": "0987654321",
  "shippingAddress": "123 Nguyen Hue, Quan 1, TP.HCM",
  "paymentMethod": "COD",
  "notes": "Giao hang trong gio hanh chinh",
  "couponCode": "DISCOUNT10",
  "shippingFee": 30000,
  "items": [
    {
      "productId": "1",
      "quantity": 1
    }
  ]
}
```

#### Request Body (From User Cart - Bearer Token Required):
```json
{
  "customerName": "John Doe",
  "customerPhone": "0987654321",
  "shippingAddress": "123 Nguyen Hue, Quan 1, TP.HCM",
  "paymentMethod": "COD",
  "shippingFee": 30000
}
```

#### Response (`201 Created`):
```json
{
  "message": "Order placed successfully",
  "order": {
    "id": "1",
    "code": "ORD-1723123456789-1234",
    "userId": "1",
    "customerName": "John Doe",
    "customerPhone": "0987654321",
    "shippingAddress": "123 Nguyen Hue, Quan 1, TP.HCM",
    "subtotal": 18990000,
    "shippingFee": 30000,
    "discountAmount": 1000000,
    "totalAmount": 18020000,
    "status": "PENDING",
    "paymentMethod": "COD",
    "paymentStatus": "PENDING",
    "notes": "Giao hang trong gio hanh chinh",
    "couponCode": "DISCOUNT10",
    "items": [
      {
        "id": "1",
        "orderId": "1",
        "productId": "1",
        "quantity": 1,
        "price": 18990000,
        "productName": "Laptop MSI Katana 15",
        "productSku": "MSI-KATANA-15",
        "specifications": null,
        "image": "https://example.com/image.jpg",
        "createdAt": "2026-08-08T15:00:00.000Z",
        "updatedAt": "2026-08-08T15:00:00.000Z"
      }
    ],
    "payment": {
      "id": "1",
      "orderId": "1",
      "method": "COD",
      "paymentMethodId": null,
      "amount": 18020000,
      "status": "PENDING",
      "transactionCode": null,
      "paymentUrl": null,
      "paidAt": null,
      "createdAt": "2026-08-08T15:00:00.000Z",
      "updatedAt": "2026-08-08T15:00:00.000Z"
    },
    "statusHistories": [
      {
        "id": "1",
        "orderId": "1",
        "status": "PENDING",
        "notes": "Order created successfully",
        "changedById": "1",
        "changedByName": "John Doe",
        "createdAt": "2026-08-08T15:00:00.000Z"
      }
    ],
    "createdAt": "2026-08-08T15:00:00.000Z",
    "updatedAt": "2026-08-08T15:00:00.000Z"
  }
}
```

---

### 5.2 Get My Orders
Get order history of the current authenticated user.

- **URL**: `/api/orders/my-orders`
- **Method**: `GET`
- **Access**: Protected (`Bearer <token>`)

#### Query Parameters:
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Records per page |
| `status` | string | `undefined` | Filter by `OrderStatus` (`PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPING`, `DELIVERED`, `CANCELLED`) |

#### Response (`200 OK`):
```json
{
  "orders": [
    {
      "id": "1",
      "code": "ORD-1723123456789-1234",
      "customerName": "John Doe",
      "totalAmount": 18020000,
      "status": "PENDING",
      "paymentMethod": "COD",
      "paymentStatus": "PENDING",
      "createdAt": "2026-08-08T15:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 5.3 Get Order Detail
Retrieve order details by ID or order Code. Guests can query by adding `?phone=<customerPhone>`.

- **URL**: `/api/orders/:idOrCode`
- **Method**: `GET`
- **Access**: Public / Protected (`Bearer <token>` or matching `?phone=...` query)

#### Example Request:
`GET /api/orders/ORD-1723123456789-1234` OR `GET /api/orders/1`

#### Response (`200 OK`):
```json
{
  "order": {
    "id": "1",
    "code": "ORD-1723123456789-1234",
    "customerName": "John Doe",
    "customerPhone": "0987654321",
    "shippingAddress": "123 Nguyen Hue, Quan 1, TP.HCM",
    "subtotal": 18990000,
    "shippingFee": 30000,
    "discountAmount": 1000000,
    "totalAmount": 18020000,
    "status": "PENDING",
    "paymentMethod": "COD",
    "paymentStatus": "PENDING",
    "items": [...],
    "payment": {...},
    "statusHistories": [...]
  }
}
```

---

### 5.4 Cancel Order
Cancel an order (Customer can cancel if status is `PENDING` or `CONFIRMED`; Admin can cancel anytime). Stock is automatically restored to products.

- **URL**: `/api/orders/:id/cancel`
- **Method**: `PUT`
- **Access**: Protected (`Bearer <token>`)

#### Request Body (optional):
```json
{
  "reason": "Doi y khong mua nua"
}
```

#### Response (`200 OK`):
```json
{
  "message": "Order cancelled successfully",
  "order": {
    "id": "1",
    "code": "ORD-1723123456789-1234",
    "status": "CANCELLED"
  }
}
```

---

### 5.5 Get All Orders (Admin Only)
Retrieve all orders with filters, search, and pagination.

- **URL**: `/api/orders`
- **Method**: `GET`
- **Access**: Protected (`ADMIN` role required)

#### Query Parameters:
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Records per page |
| `status` | string | `undefined` | Filter by `OrderStatus` |
| `paymentStatus` | string | `undefined` | Filter by `PaymentStatus` |
| `search` | string | `undefined` | Search by `code`, `customerName`, `customerPhone` |

#### Response (`200 OK`):
```json
{
  "orders": [...],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 5.6 Update Order Status (Admin Only)
Update the workflow status of an order. If status is updated to `CANCELLED`, product stock will be automatically restored.

- **URL**: `/api/orders/:id/status`
- **Method**: `PUT`
- **Access**: Protected (`ADMIN` role required)

#### Request Body:
```json
{
  "status": "CONFIRMED", // PENDING, CONFIRMED, PROCESSING, SHIPPING, SHIPPED, DELIVERED, CANCELLED
  "notes": "Da xac nhan don hang va chuyen sang bo phan kho"
}
```

#### Response (`200 OK`):
```json
{
  "message": "Order status updated to CONFIRMED",
  "order": {
    "id": "1",
    "code": "ORD-1723123456789-1234",
    "status": "CONFIRMED"
  }
}
```

---

### 5.7 Update Payment Status (Admin Only)
Update payment status of an order (e.g., mark as `PAID` or `REFUNDED`).

- **URL**: `/api/orders/:id/payment-status`
- **Method**: `PUT`
- **Access**: Protected (`ADMIN` role required)

#### Request Body:
```json
{
  "paymentStatus": "PAID", // PENDING, PAID, SUCCESS, FAILED, REFUNDED
  "transactionCode": "VNP12345678"
}
```

#### Response (`200 OK`):
```json
{
  "message": "Payment status updated to PAID",
  "order": {
    "id": "1",
    "code": "ORD-1723123456789-1234",
    "paymentStatus": "PAID"
  }
}
```

---

## 6. User Management Endpoints (`/api/users`)

All endpoints under `/api/users` are **Protected** and require `ADMIN` role (`Authorization: Bearer <token>`).

### 6.1 Get All Users
Retrieve a paginated list of users with search, role, and status filtering, including total orders and accumulated spent amount.

- **URL**: `/api/users`
- **Method**: `GET`
- **Access**: Protected (`ADMIN` role required)

#### Query Parameters:
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Records per page |
| `role` | string | `undefined` | Filter by role (`ADMIN`, `CUSTOMER`) |
| `status` | string | `undefined` | Filter by status (`ACTIVE`, `INACTIVE`, `BANNED`) |
| `search` | string | `undefined` | Search by `fullName`, `email`, `username`, `phone` |

#### Response (`200 OK`):
```json
{
  "users": [
    {
      "id": "1",
      "username": "johndoe",
      "email": "john@example.com",
      "fullName": "John Doe",
      "phone": "0987654321",
      "avatar": null,
      "role": "CUSTOMER",
      "status": "ACTIVE",
      "ordersCount": 5,
      "totalSpent": 125490000,
      "createdAt": "2026-08-08T14:30:00.000Z",
      "updatedAt": "2026-08-08T14:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 6.2 Get User Detail
Retrieve detailed profile of a specific user including recent orders and total spending.

- **URL**: `/api/users/:id`
- **Method**: `GET`
- **Access**: Protected (`ADMIN` role required)

#### Response (`200 OK`):
```json
{
  "user": {
    "id": "1",
    "username": "johndoe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "phone": "0987654321",
    "avatar": null,
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "ordersCount": 5,
    "reviewsCount": 2,
    "totalSpent": 125490000,
    "recentOrders": [...]
  }
}
```

---

### 6.3 Create User (Admin Action)
Admin creates a new user or admin account directly.

- **URL**: `/api/users`
- **Method**: `POST`
- **Access**: Protected (`ADMIN` role required)
- **Headers**: `Content-Type: application/json`

#### Request Body:
```json
{
  "username": "admin_test",
  "email": "admin@example.com",
  "password": "password123",
  "fullName": "Admin User",
  "phone": "0912345678",
  "role": "ADMIN",
  "status": "ACTIVE"
}
```

---

### 6.4 Update User
Update user details, change user role, or lock/unlock account status.

- **URL**: `/api/users/:id`
- **Method**: `PUT`
- **Access**: Protected (`ADMIN` role required)
- **Headers**: `Content-Type: application/json`

#### Request Body:
```json
{
  "fullName": "John Updated",
  "phone": "0988777666",
  "role": "CUSTOMER",
  "status": "BANNED"
}
```

---

### 6.5 Delete User
Permanently remove a user account.

- **URL**: `/api/users/:id`
- **Method**: `DELETE`
- **Access**: Protected (`ADMIN` role required)

#### Response (`200 OK`):
```json
{
  "message": "User deleted successfully"
}
```


