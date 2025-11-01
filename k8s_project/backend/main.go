// backend/main.go (최종 완성본 - Tag Filter 추가)

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

// ... (Review 구조체는 이전과 동일) ...
type Review struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Name      string             `bson:"name" json:"name"`
	Store     string             `bson:"store" json:"store"`
	Category  string             `bson:"category" json:"category"`
	Menu      string             `bson:"menu" json:"menu"`
	Taste     string             `bson:"taste" json:"taste"`
	Tags      []string           `bson:"tags" json:"tags"`
	Memo      string             `bson:"memo" json:"memo"`
	Recommend string             `bson:"recommend" json:"recommend"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}

var reviewCollection *mongo.Collection

func main() {
	// ... (DB 연결, 서버 설정은 이전과 동일) ...
	port := os.Getenv("PORT")
	mongoURI := os.Getenv("GUESTBOOK_DB_ADDR")
	if port == "" { port = "8000" }
	if mongoURI == "" { log.Fatal("GUESTBOOK_DB_ADDR environment variable is not defined") }

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil { log.Fatal("Failed to connect to MongoDB:", err) }
	err = client.Ping(ctx, nil)
	if err != nil { log.Fatal("Failed to ping MongoDB:", err) }
	log.Println("✅ Successfully connected to MongoDB")
	reviewCollection = client.Database("guestbook").Collection("reviews")

	router := gin.Default()
	router.Use(cors.Default())
	
	router.GET("/reviews", getReviews)
	router.POST("/reviews", createReview)
	router.DELETE("/reviews/:id", deleteReview)
	router.GET("/reviews/:id", getReviewByID)
	router.PUT("/reviews/:id", updateReview)

	log.Printf("App listening on port %s\n", port)
	router.Run(":" + port)
}

// --- 핸들러 함수들 ---

func getReviews(c *gin.Context) {
	category := c.Query("category")
	tag := c.Query("tag") // 🟢 1. 'tag' 쿼리 파라미터 받기

	filter := bson.M{}
	
	// 🟢 2. 필터 로직 수정
	if category != "" && category != "전체" {
		filter["category"] = category
	} else if tag != "" {
		// 🟢 3. 'tags' 배열에 해당 태그가 포함되어 있는지 검색
		filter["tags"] = tag 
	}
	
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := reviewCollection.Find(context.Background(), filter, opts)
	if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"}); return }
	defer cursor.Close(context.Background())
	var reviews []Review
	if err = cursor.All(context.Background(), &reviews); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode reviews"}); return }
	
	c.JSON(http.StatusOK, reviews)
}

// (createReview, deleteReview, getReviewByID, updateReview 핸들러는 이전과 동일)
func createReview(c *gin.Context) {
	var review Review
	if err := c.ShouldBindJSON(&review); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON body"}); return }
	if review.Name == "" || review.Store == "" || review.Category == "" || review.Menu == "" || review.Taste == "" || review.Recommend == "" { c.JSON(http.StatusBadRequest, gin.H{"error": "모든 필수 필드를 입력해야 합니다."}); return }
	if review.Tags == nil || len(review.Tags) == 0 { c.JSON(http.StatusBadRequest, gin.H{"error": "태그는 최소 1개 이상 선택해야 합니다."}); return }
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
func getReviewByID(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"}); return }
	var review Review
	err = reviewCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&review)
	if err != nil { c.JSON(http.StatusNotFound, gin.H{"error": "Review not found"}); return }
	c.JSON(http.StatusOK, review)
}
func updateReview(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"}); return }
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
	result, err := reviewCollection.UpdateOne(context.Background(), bson.M{"_id": id}, update)
	if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update review"}); return }
	if result.ModifiedCount == 0 { c.JSON(http.StatusNotFound, gin.H{"error": "Review not found or no changes made"}); return }
	c.JSON(http.StatusOK, gin.H{"ok": true})
}