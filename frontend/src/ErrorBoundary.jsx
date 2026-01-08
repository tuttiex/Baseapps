import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('React Error Boundary caught an error:', error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Fallback UI when an error occurs
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '20px',
                    backgroundColor: '#1a1a2e',
                    color: '#ffffff',
                    textAlign: 'center',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <div style={{
                        maxWidth: '600px',
                        padding: '40px',
                        backgroundColor: '#16213e',
                        borderRadius: '10px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                    }}>
                        <h1 style={{
                            fontSize: '2.5rem',
                            marginBottom: '20px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>
                            Oops! Something went wrong
                        </h1>
                        <p style={{
                            fontSize: '1.1rem',
                            marginBottom: '30px',
                            color: '#e0e0e0',
                            lineHeight: '1.6'
                        }}>
                            We encountered an unexpected error. Don't worry, your data is safe.
                            Try refreshing the page to continue.
                        </p>
                        <button
                            onClick={this.handleReload}
                            style={{
                                padding: '12px 30px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: '#ffffff',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                            }}
                        >
                            Reload Page
                        </button>

                        {/* Show error details in development mode */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details style={{
                                marginTop: '30px',
                                textAlign: 'left',
                                padding: '15px',
                                backgroundColor: '#0f1419',
                                borderRadius: '5px',
                                fontSize: '0.9rem',
                                color: '#ff6b6b'
                            }}>
                                <summary style={{ cursor: 'pointer', marginBottom: '10px', fontWeight: 'bold' }}>
                                    Error Details (Development Only)
                                </summary>
                                <p style={{ marginBottom: '10px', fontFamily: 'monospace' }}>
                                    {this.state.error.toString()}
                                </p>
                                <pre style={{
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontSize: '0.85rem',
                                    lineHeight: '1.4',
                                    color: '#ffa07a'
                                }}>
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
