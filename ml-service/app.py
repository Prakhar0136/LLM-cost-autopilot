from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)

# Load our Kaggle-trained pipeline
print("Loading complexity classifier models...")
vectorizer = joblib.load('tfidf_vectorizer.joblib')
model = joblib.load('complexity_model.joblib')
print("Models loaded successfully!")

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    if not data or 'prompt' not in data:
        return jsonify({'error': 'Missing prompt field'}), 400
    
    prompt = data['prompt']
    
    # Transform text and predict
    vectorized_text = vectorizer.transform([prompt])
    prediction = model.predict(vectorized_text)[0] # Returns 'simple', 'moderate', or 'complex'
    
    return jsonify({
        'tier': prediction
    })

if __name__ == '__main__':
    # Run locally on port 5001
    app.run(port=5001, debug=True)