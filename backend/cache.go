package followercount

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var redisClient *redis.Client

const cacheTTL = 30 * 24 * time.Hour // 30 days

func InitRedis() {
	url := os.Getenv("REDIS_URL")
	if url == "" {
		url = "redis://localhost:6379"
	}

	opts, err := redis.ParseURL(url)
	if err != nil {
		log.Printf("Warning: invalid REDIS_URL %q: %v (caching disabled)", url, err)
		return
	}

	redisClient = redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Printf("Warning: Redis connection failed: %v (caching disabled)", err)
		redisClient = nil
	} else {
		log.Printf("Connected to Redis at %s", url)
	}
}

func hashEmail(email string) string {
	h := sha256.Sum256([]byte(email))
	return hex.EncodeToString(h[:])
}

func cacheKey(emailHash string) string {
	return fmt.Sprintf("result:%s", emailHash)
}

type CachedResult struct {
	Result    APIResponse `json:"result"`
	CachedAt  int64       `json:"cached_at"`
}

func SaveResult(ctx context.Context, emailHash string, result APIResponse) {
	if redisClient == nil {
		return
	}

	cached := CachedResult{
		Result:   result,
		CachedAt: time.Now().Unix(),
	}

	data, err := json.Marshal(cached)
	if err != nil {
		log.Printf("Failed to marshal cached result: %v", err)
		return
	}

	if err := redisClient.Set(ctx, cacheKey(emailHash), data, cacheTTL).Err(); err != nil {
		log.Printf("Failed to save result to Redis: %v", err)
	}
}

func GetResult(ctx context.Context, emailHash string) (*CachedResult, error) {
	if redisClient == nil {
		return nil, fmt.Errorf("redis not available")
	}

	data, err := redisClient.Get(ctx, cacheKey(emailHash)).Bytes()
	if err != nil {
		return nil, err
	}

	var cached CachedResult
	if err := json.Unmarshal(data, &cached); err != nil {
		return nil, err
	}

	return &cached, nil
}

func DeleteResult(ctx context.Context, emailHash string) error {
	if redisClient == nil {
		return fmt.Errorf("redis not available")
	}

	return redisClient.Del(ctx, cacheKey(emailHash)).Err()
}

// --- Facebook cache ---

func fbCacheKey(emailHash string) string {
	return fmt.Sprintf("fb_result:%s", emailHash)
}

type FacebookCachedResult struct {
	Result   FacebookAnalysisResult `json:"result"`
	CachedAt int64                  `json:"cached_at"`
}

func SaveFacebookResult(ctx context.Context, emailHash string, result FacebookAnalysisResult) {
	if redisClient == nil {
		return
	}

	cached := FacebookCachedResult{
		Result:   result,
		CachedAt: time.Now().Unix(),
	}

	data, err := json.Marshal(cached)
	if err != nil {
		log.Printf("Failed to marshal Facebook cached result: %v", err)
		return
	}

	if err := redisClient.Set(ctx, fbCacheKey(emailHash), data, cacheTTL).Err(); err != nil {
		log.Printf("Failed to save Facebook result to Redis: %v", err)
	}
}

func GetFacebookResult(ctx context.Context, emailHash string) (*FacebookCachedResult, error) {
	if redisClient == nil {
		return nil, fmt.Errorf("redis not available")
	}

	data, err := redisClient.Get(ctx, fbCacheKey(emailHash)).Bytes()
	if err != nil {
		return nil, err
	}

	var cached FacebookCachedResult
	if err := json.Unmarshal(data, &cached); err != nil {
		return nil, err
	}

	return &cached, nil
}

func DeleteFacebookResult(ctx context.Context, emailHash string) error {
	if redisClient == nil {
		return fmt.Errorf("redis not available")
	}

	return redisClient.Del(ctx, fbCacheKey(emailHash)).Err()
}
