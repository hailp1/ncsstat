import Link from 'next/link';
import { AlertTriangle, ArrowLeft, ShieldAlert } from 'lucide-react';
import Header from '@/components/layout/Header';
import { createClient } from '@/utils/supabase/server';

export const metadata = {
    title: 'Tuyên bố miễn trừ trách nhiệm - ncsStat',
    description: 'Điều khoản miễn trừ trách nhiệm và cảnh báo về phiên bản Beta của ncsStat'
};

export default async function DisclaimerPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
            <Header user={user} />

            <div className="container mx-auto px-6 py-12 max-w-4xl">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại trang chủ
                </Link>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                    {/* Header Banner */}
                    <div className="bg-orange-600 p-8 md:p-10 text-white">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <ShieldAlert className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold">Tuyên bố miễn trừ trách nhiệm</h1>
                                <p className="text-orange-100 font-medium">Legal Disclaimer & Beta Notice</p>
                            </div>
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold border border-white/30">
                            <span>PHIÊN BẢN BETA THỬ NGHIỆM</span>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 prose prose-slate max-w-none">
                        <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-r-lg mb-8">
                            <div className="flex gap-3">
                                <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-orange-900 font-bold text-lg m-0 mb-2 uppercase">Cảnh báo quan trọng</h3>
                                    <p className="text-orange-800 m-0 text-sm leading-relaxed">
                                        Hệ thống ncsStat đang trong giai đoạn thử nghiệm chức năng (Beta).
                                        Người dùng cần tự chịu trách nhiệm về việc kiểm chứng kết quả trước khi sử dụng.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4 border-b border-slate-200 pb-2">1. Bản quyền & Sở hữu trí tuệ</h2>
                        <ul className="space-y-2 text-slate-600 list-disc list-inside">
                            <li>Toàn bộ mã nguồn và logic xử lý của ncsStat thuộc quyền sở hữu của nhóm phát triển ncsStat.</li>
                            <li>Nghiêm cấm sao chép, dịch ngược mã nguồn hoặc sử dụng thương mại trái phép.</li>
                        </ul>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4 border-b border-slate-200 pb-2">2. Miễn trừ trách nhiệm tính toán</h2>
                        <p className="text-slate-600">
                            ncsStat sử dụng các thư viện mã nguồn mở uy tín (như WebR, R Project) để thực hiện tính toán. Tuy nhiên:
                        </p>
                        <ul className="space-y-2 text-slate-600 list-disc list-inside mt-2">
                            <li>Chúng tôi <strong>không đảm bảo tuyệt đối</strong> về tính chính xác của mọi kết quả trong mọi trường hợp dữ liệu.</li>
                            <li>Chúng tôi <strong>không chịu trách nhiệm</strong> cho bất kỳ sai sót nào phát sinh từ việc người dùng nhập liệu sai, chọn sai kiểm định thống kê hoặc diễn giải sai kết quả p-value, độ tin cậy, v.v.</li>
                            <li>Người dùng chịu trách nhiệm <strong className="text-slate-800">cross-check (kiểm tra chéo)</strong> kết quả với các phần mềm khác (như SPSS, STATA) trước khi công bố quốc tế.</li>
                        </ul>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4 border-b border-slate-200 pb-2">3. Trách nhiệm người dùng</h2>
                        <p className="text-slate-600">
                            Khi sử dụng ncsStat cho các công trình nghiên cứu (luận văn, bài báo, đề tài), bạn đồng ý rằng:
                        </p>
                        <ul className="space-y-2 text-slate-600 list-disc list-inside mt-2">
                            <li>Bạn chịu hoàn toàn trách nhiệm về nội dung và kết luận khoa học của sản phẩm đầu ra.</li>
                            <li>Bạn phải tuân thủ các quy định về đạo đức nghiên cứu và trích dẫn nguồn.</li>
                            <li>Việc sử dụng ncsStat là sự chấp thuận rủi ro cá nhân (Use at Your Own Risk).</li>
                        </ul>

                        <div className="mt-12 p-6 bg-slate-50 rounded-xl text-center border border-slate-200">
                            <p className="text-sm text-slate-500 mb-4">
                                Bằng việc tiếp tục sử dụng ncsStat, bạn xác nhận đã đọc và đồng ý với các điều khoản trên.
                            </p>
                            <Link
                                href="/analyze"
                                className="inline-block px-8 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-lg"
                            >
                                Tôi đồng ý và Tiếp tục sử dụng
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
