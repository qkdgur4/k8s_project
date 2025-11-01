// backend/main.go (최종 완성본)

package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Review 구조체 (데이터 모델)
type Review struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Name      string             `bson:"name" json:"name"`
	Store     string             `bson:"store" json:"store"`
	Category  string             `bson:"category" json:"category"`
	Menu      string             `bson:"menu" json:"menu"`
	Taste     string             `bson:"taste" json:"taste"`
	Mood      string             `bson:"mood" json:"mood"`
	Memo      string             `bson:"memo" json:"memo"`
	Recommend string             `bson:"recommend" json:"recommend"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}

var reviewCollection *mongo.Collection

func main() {
	port := os.Getenv("PORT")
	mongoURI := os.Getenv("GUESTBOOK_DB_ADDR")
	if port == "" { port = "8000" }
	if mongoURI == "" { log.Fatal("GUESTBOOK_DB_ADDR environment variable is not defined") }

	// DB 연결
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil { log.Fatal("Failed to connect to MongoDB:", err) }
	err = client.Ping(ctx, nil)
	if err != nil { log.Fatal("Failed to ping MongoDB:", err) }
	log.Println("✅ Successfully connected to MongoDB")
	reviewCollection = client.Database("guestbook").Collection("reviews")

	// Gin 서버 설정
	router := gin.Default()
	router.Use(cors.Default())

	// API 라우트 설정 ( /api 그룹 없이 바로 시작)
	router.GET("/reviews", getReviews)
	router.POST("/reviews", createReview)
	router.DELETE("/reviews/:id", deleteReview)

	// 🟢🟢🟢 1. 누락되었던 API 2개 추가 🟢🟢🟢
	router.GET("/reviews/:id", getReviewByID)
	router.PUT("/reviews/:id", updateReview)

	log.Printf("App listening on port %s\n", port)
	router.Run(":" + port)
}

// --- 핸들러 함수들 ---

// (getReviews, createReview, deleteReview 핸들러는 이전과 동일)
func getReviews(c *gin.Context) {
	category := c.Query("category")
	filter := bson.M{}
	if category != "" && category != "전체" { filter["category"] = category }
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := reviewCollection.Find(context.Background(), filter, opts)
	if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"}); return }
	defer cursor.Close(context.Background())
	var reviews []Review
	if err = cursor.All(context.Background(), &reviews); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode reviews"}); return }
	c.JSON(http.StatusOK, reviews)
}

func createReview(c *gin.Context) {
	var review Review
	if err := c.ShouldBindJSON(&review); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return }
	review.CreatedAt = time.Now()
	review.UpdatedAt = time.Now()
	result, err := reviewCollection.InsertOne(context.Background(), review)
	if err != nil { log.Println("Error saving review:", err); c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save review"}); return }
	review.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, review)
}

func deleteReview(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"}); return }
	result, err := reviewCollection.DeleteOne(context.Background(), bson.M{"_id": id})
	if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete review"}); return }
	if result.DeletedCount == 0 { c.JSON(http.StatusNotFound, gin.H{"error": "Not found"}); return }
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// 🟢🟢🟢 2. 새로 추가된 핸들러 2개 🟢🟢🟢

// GET /reviews/:id 핸들러 (1건 조회)
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
	c.JSON(http.StatusOK, review)
}

// PUT /reviews/:id 핸들러 (1건 수정)
func updateReview(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}
	
	var reviewUpdate Review
	if err := c.ShouldBindJSON(&reviewUpdate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON body"})
		return
	}

	update := bson.M{
		"$set": bson.M{
			"name":      reviewUpdate.Name,
			"store":     reviewUpdate.Store,
			"category":  reviewUpdate.Category,
			"menu":      reviewUpdate.Menu,
			"taste":     reviewUpdate.Taste,
			"mood":      reviewUpdate.Mood,
			"memo":      reviewUpdate.Memo,
			"recommend": reviewUpdate.Recommend,
			"updatedAt": time.Now(),
		},
	}

	result, err := reviewCollection.UpdateOne(context.Background(), bson.M{"_id": id}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update review"})
		return
	}
	if result.ModifiedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Review not found or no changes made"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}