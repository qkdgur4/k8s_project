// backend/main.go (MongoDB 인증 로직 수정 완료)

package main

import (
   "context"
   "errors"
   "log"
   "math"
   "net/http"
   "os"
   "strconv"
   "strings"
   "time"

   "github.com/gin-contrib/cors"
   "github.com/gin-gonic/gin"
   "go.mongodb.org/mongo-driver/bson"
   "go.mongodb.org/mongo-driver/bson/primitive"
   "go.mongodb.org/mongo-driver/mongo"
   "go.mongodb.org/mongo-driver/mongo/options"
   "golang.org/x/crypto/bcrypt"

   "github.com/golang-jwt/jwt/v5"
)

var jwtKey = []byte(os.Getenv("JWT_SECRET_KEY"))

// 1. DB 저장을 위한 원본 구조체 (BSON)
type User struct {
   ID       primitive.ObjectID `bson:"_id,omitempty"`
   Username string             `bson:"username"`
   Password string             `bson:"password"`
}
type Review struct {
   ID         primitive.ObjectID `bson:"_id,omitempty"`
   AuthorID   primitive.ObjectID `bson:"authorId"`
   AuthorName string             `bson:"authorName"`
   Name       string             `bson:"name"`
   Store      string             `bson:"store"`
   Category   string             `bson:"category"`
   Menu       string             `bson:"menu"`
   Taste      string             `bson:"taste"`
   Tags       []string           `bson:"tags"`
   Memo       string             `bson:"memo"`
   Recommend  string             `bson:"recommend"`
   CreatedAt  time.Time          `bson:"createdAt"`
   UpdatedAt  time.Time          `bson:"updatedAt"`
}

// 2. 프론트엔드(JSON)로 보낼 때 사용할 구조체 (ID를 string으로)
type ReviewJSON struct {
   ID         string    `json:"_id"`
   AuthorID   string    `json:"authorId"`
   AuthorName string    `json:"authorName"`
   Name       string    `json:"name"`
   Store      string    `json:"store"`
   Category   string    `json:"category"`
   Menu       string    `json:"menu"`
   Taste      string    `json:"taste"`
   Tags       []string  `json:"tags"`
   Memo       string    `json:"memo"`
   Recommend  string    `json:"recommend"`
   CreatedAt  time.Time `json:"createdAt"`
   UpdatedAt  time.Time `json:"updatedAt"`
}
type PaginatedReviewsJSON struct {
   Reviews     []ReviewJSON `json:"reviews"`
   CurrentPage int64        `json:"currentPage"`
   TotalPages  int64        `json:"totalPages"`
}

var userCollection *mongo.Collection
var reviewCollection *mongo.Collection

func main() {
   port := os.Getenv("PORT")
   mongoURI := os.Getenv("GUESTBOOK_DB_ADDR")
    
    // --- 🟢 [수정 시작] 인증 정보 읽어오기 ---
   dbUser := os.Getenv("DB_USER")
   dbPass := os.Getenv("DB_PASSWORD")
    // --- 🟢 [수정 끝] ---

   if port == "" {
      port = "8000"
   }
   if mongoURI == "" {
      log.Fatal("GUESTBOOK_DB_ADDR environment variable is not defined")
   }
   if os.Getenv("JWT_SECRET_KEY") == "" {
      log.Fatal("JWT_SECRET_KEY environment variable is not defined")
   }

   ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
   defer cancel()

    // --- 🟢 [수정 시작] 인증 옵션 추가 ---
    // 1. 클라이언트 옵션을 URI로 설정
   clientOptions := options.Client().ApplyURI(mongoURI)

    // 2. 환경 변수에서 읽어온 인증 정보를 옵션에 추가
    //    (kevin 계정은 'admin' DB에 생성했으므로 AuthSource: "admin" 필수)
   if dbUser != "" && dbPass != "" {
      clientOptions.SetAuth(options.Credential{
         AuthSource: "admin", // 'kevin' 계정이 생성된 DB
         Username:   dbUser,
         Password:   dbPass,
      })
   }

    // 3. 인증 정보가 포함된 옵션으로 연결
   client, err := mongo.Connect(ctx, clientOptions)
    // --- 🟢 [수정 끝] ---

   if err != nil {
      log.Fatal("Failed to connect to MongoDB:", err)
   }

    // 이제 Ping은 인증된 연결로 시도됩니다.
   err = client.Ping(ctx, nil)
   if err != nil {
      log.Fatal("Failed to ping MongoDB:", err)
   }
   log.Println("✅ Successfully connected to MongoDB")

   db := client.Database("guestbook")
   userCollection = db.Collection("users")
   reviewCollection = db.Collection("reviews")

   userCollection.Indexes().CreateOne(
      context.Background(),
      mongo.IndexModel{
         Keys:    bson.D{{Key: "username", Value: 1}},
         Options: options.Index().SetUnique(true),
      },
   )

   router := gin.Default()
   router.Use(cors.Default())

   router.POST("/register", registerUser)
   router.POST("/login", loginUser)
   router.GET("/reviews", getReviews)

   api := router.Group("/api")
   api.Use(authMiddleware())
   {
      api.POST("/reviews", createReview)
      api.DELETE("/reviews/:id", deleteReview)
      api.GET("/reviews/:id", getReviewByID)
      api.PUT("/reviews/:id", updateReview)
   }

   log.Printf("App listening on port %s\n", port)
   router.Run(":" + port)
}

func hashPassword(password string) (string, error) {
   bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
   return string(bytes), err
}
func checkPasswordHash(password, hash string) bool {
   err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
   return err == nil
}

// --- (registerUser 핸들러는 이전 수정본 그대로 유지) ---
func registerUser(c *gin.Context) {
   var user User
   if err := c.ShouldBindJSON(&user); err != nil {
      c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON body"})
      return
   }
   if user.Username == "" || user.Password == "" {
      c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required"})
      return
   }
   hashedPassword, err := hashPassword(user.Password)
   if err != nil {
      c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
      return
   }
   user.Password = hashedPassword
   user.ID = primitive.NewObjectID()

   // ◀ MongoDB InsertOne 호출
   _, err = userCollection.InsertOne(context.Background(), user)

   if err != nil {
      // 1. 상세 오류 로그 출력 (추가된 로깅)
      log.Println("MongoDB InsertOne Error:", err)

      // 2. 오류 타입 확인: Duplicate Key Error (11000)인지 확인
      if mongo.IsDuplicateKeyError(err) {
         c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
         return
      }

      // 3. 그 외의 모든 알 수 없는 DB 오류는 500 Internal Server Error로 처리
      c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register user due to internal error"})
      return
   }

   c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully"})
}

// --- (이하 핸들러는 이전과 동일) ---

func loginUser(c *gin.Context) {
   var input User
   if err := c.ShouldBindJSON(&input); err != nil {
      c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON body"})
      return
   }
   var user User
   err := userCollection.FindOne(context.Background(), bson.M{"username": input.Username}).Decode(&user)
   if err != nil {
      c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
      return
   }
   if !checkPasswordHash(input.Password, user.Password) {
      c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
      return
   }
   token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
      "userId":   user.ID.Hex(),
      "username": user.Username,
      "exp":      time.Now().Add(time.Hour * 24).Unix(),
   })
   tokenString, err := token.SignedString(jwtKey)
   if err != nil {
      c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create token"})
      return
   }
   c.JSON(http.StatusOK, gin.H{"token": tokenString, "userId": user.ID.Hex(), "username": user.Username})
}
func authMiddleware() gin.HandlerFunc {
   return func(c *gin.Context) {
      authHeader := c.GetHeader("Authorization")
      if authHeader == "" {
         c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
         return
      }
      tokenString := strings.TrimPrefix(authHeader, "Bearer ")
      if tokenString == authHeader {
         c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
         return
      }

      token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
         if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, errors.New("unexpected signing method")
         }
         return jwtKey, nil
      })

      if err != nil {
         c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token: " + err.Error()})
         return
      }

      if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
         userId, ok1 := claims["userId"].(string)
         username, ok2 := claims["username"].(string)
         if !ok1 || !ok2 {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
            return
         }
         c.Set("userId", userId)
         c.Set("username", username)
         c.Next()
      } else {
         c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
      }
   }
}

func getReviews(c *gin.Context) {
   category := c.Query("category")
   tag := c.Query("tag")
   pageQuery := c.DefaultQuery("page", "1")
   page, err := strconv.ParseInt(pageQuery, 10, 64)
   if err != nil || page < 1 {
      page = 1
   }
   limit := int64(10)
   skip := (page - 1) * limit
   filter := bson.M{}
   if category != "" && category != "전체" {
      filter["category"] = category
   } else if tag != "" {
      filter["tags"] = tag
   }

   totalCount, err := reviewCollection.CountDocuments(context.Background(), filter)
   if err != nil {
      c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count documents"})
      return
   }
   opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetSkip(skip).SetLimit(limit)
   cursor, err := reviewCollection.Find(context.Background(), filter, opts)
   if err != nil {
      c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
      return
   }
   defer cursor.Close(context.Background())

   var reviews []Review // DB에서 가져온 원본 데이터
   if err = cursor.All(context.Background(), &reviews); err != nil {
      c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode reviews"})
      return
   }

   // 🟢 4. DB에서 가져온 []Review를 프론트엔드용 []ReviewJSON으로 변환
   reviewsJSON := make([]ReviewJSON, len(reviews))
   for i, review := range reviews {
      reviewsJSON[i] = ReviewJSON{
         ID:         review.ID.Hex(),
         AuthorID:   review.AuthorID.Hex(), // 🟢 바로 여기가 핵심 수정!
         AuthorName: review.AuthorName,
         Name:       review.Name,
         Store:      review.Store,
         Category:   review.Category,
         Menu:       review.Menu,
         Taste:      review.Taste,
         Tags:       review.Tags,
         Memo:       review.Memo,
         Recommend:  review.Recommend,
         CreatedAt:  review.CreatedAt,
         UpdatedAt:  review.UpdatedAt,
      }
   }

   response := PaginatedReviewsJSON{ // 🟢 JSON용 구조체로 응답
      Reviews:     reviewsJSON,
      CurrentPage: page,
      TotalPages:  int64(math.Ceil(float64(totalCount) / float64(limit))),
   }

   c.JSON(http.StatusOK, response)
}

func createReview(c *gin.Context) {
   var review Review
   if err := c.ShouldBindJSON(&review); err != nil {
      c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON body"})
      return
   }
   if review.Name == "" || review.Store == "" || review.Category == "" || review.Menu == "" || review.Taste == "" || review.Recommend == "" {
      c.JSON(http.StatusBadRequest, gin.H{"error": "모든 필수 필드를 입력해야 합니다."})
      return
   }
   if review.Tags == nil || len(review.Tags) == 0 {
      c.JSON(http.StatusBadRequest, gin.H{"error": "태그는 최소 1개 이상 선택해야 합니다."})
      return
   }
   authorIDStr, _ := c.Get("userId")
   authorName, _ := c.Get("username")
   authorID, _ := primitive.ObjectIDFromHex(authorIDStr.(string))
   review.AuthorID = authorID
   review.AuthorName = authorName.(string)
   review.CreatedAt = time.Now()
   review.UpdatedAt = time.Now()
   result, err := reviewCollection.InsertOne(context.Background(), review)
   if err != nil {
      log.Println("Error saving review:", err)
      c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save review"})
      return
   }
   review.ID = result.InsertedID.(primitive.ObjectID)

   // 🟢 생성 응답도 JSON용으로 변환 (ID/AuthorID를 string으로)
   c.JSON(http.StatusCreated, ReviewJSON{
      ID: review.ID.Hex(), AuthorID: review.AuthorID.Hex(), AuthorName: review.AuthorName,
      Name: review.Name, Store: review.Store, Category: review.Category, Menu: review.Menu,
      Taste: review.Taste, Tags: review.Tags, Memo: review.Memo, Recommend: review.Recommend,
      CreatedAt: review.CreatedAt, UpdatedAt: review.UpdatedAt,
   })
}

func getReviewByID(c *gin.Context) {
   id, err := primitive.ObjectIDFromHex(c.Param("id"))
   if err != nil {
      c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
      return
   }
   var review Review
   err = reviewCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&review)
   if err != nil {
      c.JSON(http.StatusNotFound, gin.H{"error": "Review not found"})
      return
   }

   // 🟢 1건 조회 응답도 JSON용으로 변환
   c.JSON(http.StatusOK, ReviewJSON{
      ID: review.ID.Hex(), AuthorID: review.AuthorID.Hex(), AuthorName: review.AuthorName,
      Name: review.Name, Store: review.Store, Category: review.Category, Menu: review.Menu,
      Taste: review.Taste, Tags: review.Tags, Memo: review.Memo, Recommend: review.Recommend,
      CreatedAt: review.CreatedAt, UpdatedAt: review.UpdatedAt,
   })
}

func updateReview(c *gin.Context) {
   id, err := primitive.ObjectIDFromHex(c.Param("id"))
   if err != nil {
      c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
      return
   }
   loggedInUserIDStr, _ := c.Get("userId")
   loggedInUserID, _ := primitive.ObjectIDFromHex(loggedInUserIDStr.(string))
   var originalReview Review
   err = reviewCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&originalReview)
   if err != nil {
      c.JSON(http.StatusNotFound, gin.H{"error": "Review not found"})
      return
   }
   if originalReview.AuthorID != loggedInUserID {
      c.JSON(http.StatusForbidden, gin.H{"error": "본인의 글만 수정할 수 있습니다."})
      return
   }
   var reviewUpdate Review
   if err := c.ShouldBindJSON(&reviewUpdate); err != nil {
      c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON body"})
      return
   }
   if reviewUpdate.Name == "" || reviewUpdate.Store == "" || reviewUpdate.Category == "" || reviewUpdate.Menu == "" || reviewUpdate.Taste == "" || reviewUpdate.Recommend == "" {
      c.JSON(http.StatusBadRequest, gin.H{"error": "모든 필수 필드를 입력해야 합니다."})
      return
   }
   if reviewUpdate.Tags == nil || len(reviewUpdate.Tags) == 0 {
      c.JSON(http.StatusBadRequest, gin.H{"error": "태그는 최소 1개 이상 선택해야 합니다."})
      return
   }
   update := bson.M{
      "$set": bson.M{
         "name":      reviewUpdate.Name,
         "store":     reviewUpdate.Store,
         "category":  reviewUpdate.Category,
         "menu":      reviewUpdate.Menu,
         "taste":     reviewUpdate.Taste,
         "tags":      reviewUpdate.Tags,
         "memo":      reviewUpdate.Memo,
         "recommend": reviewUpdate.Recommend,
         "updatedAt": time.Now(),
      },
   }
   _, err = reviewCollection.UpdateOne(context.Background(), bson.M{"_id": id}, update)
   if err != nil {
      c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update review"})
      return
   }
   c.JSON(http.StatusOK, gin.H{"ok": true})
}

func deleteReview(c *gin.Context) {
   id, err := primitive.ObjectIDFromHex(c.Param("id"))
   if err != nil {
      c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
      return
   }
   loggedInUserIDStr, _ := c.Get("userId")
   loggedInUserID, _ := primitive.ObjectIDFromHex(loggedInUserIDStr.(string))
   var originalReview Review
   err = reviewCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&originalReview)
   if err != nil {
      c.JSON(http.StatusNotFound, gin.H{"error": "Review not found"})
      return
   }
   if originalReview.AuthorID != loggedInUserID {
      c.JSON(http.StatusForbidden, gin.H{"error": "본인의 글만 삭제할 수 있습니다."})
      return
   }
   _, err = reviewCollection.DeleteOne(context.Background(), bson.M{"_id": id})
   if err != nil {
      c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete review"})
      return
   }
   c.JSON(http.StatusOK, gin.H{"ok": true})
}