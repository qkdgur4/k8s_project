// backend/main.go (최종 완성본 - 'any' 타입 문제 해결)

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

// ... (User, Review, PaginatedReviews 구조체는 이전과 동일) ...
type User struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Username string             `bson:"username" json:"username"`
	Password string             `bson:"password" json:"password"`
}
type Review struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	AuthorID   primitive.ObjectID `bson:"authorId" json:"authorId"`
	AuthorName string             `bson:"authorName" json:"authorName"`
	Name       string             `bson:"name" json:"name"`
	Store      string             `bson:"store" json:"store"`
	Category   string             `bson:"category" json:"category"`
	Menu       string             `bson:"menu" json:"menu"`
	Taste      string             `bson:"taste" json:"taste"`
	Tags       []string           `bson:"tags" json:"tags"`
	Memo       string             `bson:"memo" json:"memo"`
	Recommend  string             `bson:"recommend" json:"recommend"`
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt  time.Time          `bson:"updatedAt" json:"updatedAt"`
}
type PaginatedReviews struct {
	Reviews     []Review `json:"reviews"`
	CurrentPage int64    `json:"currentPage"`
	TotalPages  int64    `json:"totalPages"`
}

var userCollection *mongo.Collection
var reviewCollection *mongo.Collection

func main() {
	// ... (main 함수 시작 부분은 이전과 동일) ...
	port := os.Getenv("PORT")
	mongoURI := os.Getenv("GUESTBOOK_DB_ADDR")
	if port == "" { port = "8000" }
	if mongoURI == "" { log.Fatal("GUESTBOOK_DB_ADDR environment variable is not defined") }
	if os.Getenv("JWT_SECRET_KEY") == "" { log.Fatal("JWT_SECRET_KEY environment variable is not defined") }

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil { log.Fatal("Failed to connect to MongoDB:", err) }
	err = client.Ping(ctx, nil)
	if err != nil { log.Fatal("Failed to ping MongoDB:", err) }
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

// ... (registerUser, loginUser 핸들러는 이전과 동일) ...
func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}
func checkPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
func registerUser(c *gin.Context) {
	var user User
	if err := c.ShouldBindJSON(&user); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON body"}); return }
	if user.Username == "" || user.Password == "" { c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required"}); return }
	hashedPassword, err := hashPassword(user.Password); if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"}); return }
	user.Password = hashedPassword
	user.ID = primitive.NewObjectID()
	_, err = userCollection.InsertOne(context.Background(), user); if err != nil { c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"}); return }
	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully"})
}
func loginUser(c *gin.Context) {
	var input User
	if err := c.ShouldBindJSON(&input); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON body"}); return }
	var user User
	err := userCollection.FindOne(context.Background(), bson.M{"username": input.Username}).Decode(&user)
	if err != nil { c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"}); return }
	if !checkPasswordHash(input.Password, user.Password) { c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"}); return }
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId":   user.ID.Hex(),
		"username": user.Username,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})
	tokenString, err := token.SignedString(jwtKey); if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create token"}); return }
	c.JSON(http.StatusOK, gin.H{ "token": tokenString, "userId": user.ID.Hex(), "username": user.Username, })
}


// ... (authMiddleware 핸들러는 이전과 동일) ...
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" { c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"}); return }
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader { c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"}); return }

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

// ... (getReviews, createReview, getReviewByID 핸들러는 이전과 동일) ...
func getReviews(c *gin.Context) {
	category := c.Query("category"); tag := c.Query("tag"); pageQuery := c.DefaultQuery("page", "1")
	page, err := strconv.ParseInt(pageQuery, 10, 64); if err != nil || page < 1 { page = 1 }
	limit := int64(10); skip := (page - 1) * limit
	filter := bson.M{}
	if category != "" && category != "전체" { filter["category"] = category } else if tag != "" { filter["tags"] = tag }
	totalCount, err := reviewCollection.CountDocuments(context.Background(), filter); if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count documents"}); return }
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetSkip(skip).SetLimit(limit)
	cursor, err := reviewCollection.Find(context.Background(), filter, opts); if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"}); return }
	defer cursor.Close(context.Background())
	var reviews []Review
	if err = cursor.All(context.Background(), &reviews); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode reviews"}); return }
	response := PaginatedReviews{ Reviews: reviews, CurrentPage: page, TotalPages: int64(math.Ceil(float64(totalCount) / float64(limit))), }
	c.JSON(http.StatusOK, response)
}
func createReview(c *gin.Context) {
	var review Review
	if err := c.ShouldBindJSON(&review); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON body"}); return }
	if review.Name == "" || review.Store == "" || review.Category == "" || review.Menu == "" || review.Taste == "" || review.Recommend == "" { c.JSON(http.StatusBadRequest, gin.H{"error": "모든 필수 필드를 입력해야 합니다."}); return }
	if review.Tags == nil || len(review.Tags) == 0 { c.JSON(http.StatusBadRequest, gin.H{"error": "태그는 최소 1개 이상 선택해야 합니다."}); return }
	authorIDStr, _ := c.Get("userId"); authorName, _ := c.Get("username")
	authorID, _ := primitive.ObjectIDFromHex(authorIDStr.(string))
	review.AuthorID = authorID
	review.AuthorName = authorName.(string)
	review.CreatedAt = time.Now(); review.UpdatedAt = time.Now()
	result, err := reviewCollection.InsertOne(context.Background(), review); if err != nil { log.Println("Error saving review:", err); c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save review"}); return }
	review.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, review)
}
func getReviewByID(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id")); if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"}); return }
	var review Review
	err = reviewCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&review); if err != nil { c.JSON(http.StatusNotFound, gin.H{"error": "Review not found"}); return }
	c.JSON(http.StatusOK, review)
}


// --- 🟢🟢🟢 여기가 수정된 핸들러 함수들입니다! 🟢🟢🟢 ---

func updateReview(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id")); if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"}); return }
	
	// 1. "만능 상자"(`any`)에서 값을 꺼냅니다.
	loggedInUserIDStr, _ := c.Get("userId")
	
	// 2. "이건 string이 맞습니다!"라고 보증(Type Assertion)합니다.
	loggedInUserID, _ := primitive.ObjectIDFromHex(loggedInUserIDStr.(string)) // 🟢 . (string) 추가

	var originalReview Review
	err = reviewCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&originalReview); if err != nil { c.JSON(http.StatusNotFound, gin.H{"error": "Review not found"}); return }
	if originalReview.AuthorID != loggedInUserID { c.JSON(http.StatusForbidden, gin.H{"error": "본인의 글만 수정할 수 있습니다."}); return }
	
	var reviewUpdate Review
	if err := c.ShouldBindJSON(&reviewUpdate); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON body"}); return }
	if reviewUpdate.Name == "" || reviewUpdate.Store == "" || reviewUpdate.Category == "" || reviewUpdate.Menu == "" || reviewUpdate.Taste == "" || reviewUpdate.Recommend == "" { c.JSON(http.StatusBadRequest, gin.H{"error": "모든 필수 필드를 입력해야 합니다."}); return }
	if reviewUpdate.Tags == nil || len(reviewUpdate.Tags) == 0 { c.JSON(http.StatusBadRequest, gin.H{"error": "태그는 최소 1개 이상 선택해야 합니다."}); return }
	
	update := bson.M{
		"$set": bson.M{
			"name": reviewUpdate.Name, "store": reviewUpdate.Store, "category": reviewUpdate.Category,
			"menu": reviewUpdate.Menu, "taste": reviewUpdate.Taste, "tags": reviewUpdate.Tags,
			"memo": reviewUpdate.Memo, "recommend": reviewUpdate.Recommend, "updatedAt": time.Now(),
		},
	}
	_, err = reviewCollection.UpdateOne(context.Background(), bson.M{"_id": id}, update); if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update review"}); return }
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func deleteReview(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id")); if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"}); return }
	
	// 1. "만능 상자"(`any`)에서 값을 꺼냅니다.
	loggedInUserIDStr, _ := c.Get("userId")
	
	// 2. "이건 string이 맞습니다!"라고 보증(Type Assertion)합니다.
	loggedInUserID, _ := primitive.ObjectIDFromHex(loggedInUserIDStr.(string)) // 🟢 . (string) 추가

	var originalReview Review
	err = reviewCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&originalReview); if err != nil { c.JSON(http.StatusNotFound, gin.H{"error": "Review not found"}); return }
	if originalReview.AuthorID != loggedInUserID { c.JSON(http.StatusForbidden, gin.H{"error": "본인의 글만 삭제할 수 있습니다."}); return }
	
	_, err = reviewCollection.DeleteOne(context.Background(), bson.M{"_id": id}); if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete review"}); return }
	c.JSON(http.StatusOK, gin.H{"ok": true})
}